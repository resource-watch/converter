const logger = require('logger');
const SQLService = require('services/sqlService');
const { geojsonToArcGIS } = require('arcgis-to-geojson-utils');
const { arcgisToGeoJSON } = require('arcgis-to-geojson-utils');
const Sql2json = require('sql2json').sql2json;
const Json2sql = require('sql2json').json2sql;
const QueryNotValid = require('errors/queryNotValid');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

const aggrFunctions = ['count', 'sum', 'min', 'max', 'avg', 'stddev', 'var'];

const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;

class ConverterService {

    static obtainSelect(fs) {
        let result = '';
        if (!fs.outFields && !fs.outStatistics) {
            return '*';
        }
        if (fs.outFields) {
            result = fs.outFields;
        }
        if (fs.outStatistics) {
            try {

                const statistics = JSON.parse(fs.outStatistics);
                if (statistics) {
                    for (let i = 0, { length } = statistics; i < length; i++) {
                        if (result) {
                            result += ', ';
                        }
                        result += `${statistics[i].statisticType}(${statistics[i].onStatisticField}) ${statistics[i].outStatisticFieldName ? ` AS ${statistics[i].outStatisticFieldName} ` : ''}`;
                    }
                }
            } catch (err) {
                logger.error('Parse error:', err);
                throw err;
            }
        }
        if (fs.returnCountOnly) {
            if (result) {
                result += ', ';
            }
            result += ' count(*) ';
        }
        return result;
    }

    static async obtainWhere(params, apiKey) {
        const fs = params;
        let where = '';
        if (fs.where) {
            if (!where) {
                where = 'WHERE ';
            }
            where += fs.where;
        }
        if (fs.geometry) {
            if (!where) {
                where = 'WHERE ';
            } else {
                where += ' AND ';
            }

            logger.debug('fs.geometry', fs.geometry);
            const esrigeojson = JSON.parse(fs.geometry.replace(/\\"/g, '"'));
            let wkid = fs.inSR ? JSON.parse(fs.inSR.replace(/\\"/g, '"')) : null;
            wkid = wkid.wkid || 4326;

            const geojson = arcgisToGeoJSON(esrigeojson);
            where += `ST_INTERSECTS(the_geom, ST_SETSRID(ST_GeomFromGeoJSON('${JSON.stringify(geojson.geometry || geojson)}'), ${wkid}))`;
        } else if (params.geostore) {
            const geojson = await ConverterService.obtainGeoStore(params.geostore, apiKey);
            if (!where) {
                where = 'WHERE ';
            } else {
                where += ' AND ';
            }
            where += `ST_INTERSECTS(the_geom, ST_SETSRID(aST_GeomFromGeoJSON('${JSON.stringify(geojson.features[0].geometry)}'), 4326))`;
        } else if (params.geojson) {
            const geojson = ConverterService.checkGeojson(params.geojson);
            if (!where) {
                where = 'WHERE ';
            } else {
                where += ' AND ';
            }
            where += `ST_INTERSECTS(the_geom, ST_SETSRID(ST_GeomFromGeoJSON('${JSON.stringify(geojson.features[0].geometry)}'), 4326))`;
        }
        return where;
    }

    static async fs2SQL(params, apiKey) {
        const fs = params;
        logger.info('Creating query from featureService', params);
        const where = await ConverterService.obtainWhere(params, apiKey);
        const sql = `SELECT ${ConverterService.obtainSelect(fs)} FROM ${params.tableName}
                ${where}
                ${fs.groupByFieldsForStatistics ? `GROUP BY ${fs.groupByFieldsForStatistics} ` : ''}
                ${fs.orderByFields ? `ORDER BY ${fs.orderByFields} ` : ''}
                ${fs.resultRecordCount ? `LIMIT ${fs.resultRecordCount}` : ''}`.replace(/\s\s+/g, ' ').trim();

        const parsed = new Sql2json(sql).toJSON();
        if (!parsed) {
            return SQLService.generateError('Malformed query');
        }
        const result = SQLService.checkSQL(parsed);

        if (result && result.error) {
            return result;
        }
        return {
            query: sql,
            parsed
        };
    }

    static obtainAggrFun(exp) {
        if (exp) {
            for (let i = 0, { length } = aggrFunctions; i < length; i++) {
                if (exp.startsWith(aggrFunctions[i])) {
                    return aggrFunctions[i];
                }
            }
        }
        return null;
    }

    static convertGeoJSONToEsriGJSON(geojson) {
        if (geojson.type === 'polygon') {
            geojson.rings = geojson.coordinates;
            delete geojson.coordinates;
        } else if (geojson.type === 'multipolygon') {
            [geojson.rings] = geojson.coordinates;
            delete geojson.coordinates;
        }
        geojson.type = 'polygon';
        return geojson;
    }

    static removeIntersect(node) {
        if (node && node.type === 'function' && node.value.toLowerCase() === 'st_intersects') {
            return null;
        }
        if (node && node.type === 'conditional') {
            const left = ConverterService.removeIntersect(node.left);
            const right = ConverterService.removeIntersect(node.right);
            if (!left) {
                return node.right;
            }
            if (!right) {
                return node.left;
            }
        }
        return node;
    }

    static findIntersect(node, found, result) {
        if (node && node.type === 'string' && node.value && found) {
            try {
                const geojson = JSON.parse(node.value);
                if (!result) {
                    // eslint-disable-next-line no-param-reassign
                    result = {};
                }
                result.geojson = geojson;
                return result;
            } catch (e) {
                return result;
            }
        }
        if (node && node.type === 'number' && node.value && found) {
            if (!result) {
                // eslint-disable-next-line no-param-reassign
                result = {};
            }
            result.wkid = node.value;
            return result;
        }
        if (node && node.type === 'function' && (node.value.toLowerCase() === 'st_intersects' || found)) {
            for (let i = 0, { length } = node.arguments; i < length; i++) {
                // eslint-disable-next-line no-param-reassign
                result = Object.assign(result || {}, ConverterService.findIntersect(node.arguments[i], true, result));
                if (result && result.geojson && result.wkid) {
                    return result;
                }
            }
        }
        if (node && node.type === 'conditional') {
            const left = ConverterService.findIntersect(node.left);
            const right = ConverterService.findIntersect(node.right);
            if (left) {
                return left;
            }
            if (right) {
                return right;
            }
        }
        return null;
    }

    static parseWhere(where) {
        logger.debug('Parsing where', where);
        const geo = ConverterService.findIntersect(where);
        const fs = {};
        if (geo) {
            fs.geometryType = 'esriGeometryPolygon';
            fs.spatialRel = 'esriSpatialRelIntersects';
            fs.inSR = JSON.stringify({
                wkid: geo.wkid
            });
            fs.geometry = JSON.stringify(geojsonToArcGIS(geo.geojson));
            const pruneWhere = ConverterService.removeIntersect(where);
            if (pruneWhere) {
                fs.where = Json2sql.parseWhere(pruneWhere);
            }
        } else {
            fs.where = Json2sql.parseWhere(where);
        }
        return fs;
    }

    static parseFunction(nodeFun) {
        const args = [];
        for (let i = 0, { length } = nodeFun.arguments; i < length; i++) {
            const node = nodeFun.arguments[i];
            switch (node.type) {

                case 'literal':
                    args.push(node.value);
                    break;
                case 'string':
                    args.push(`'${node.value}'`);
                    break;
                case 'number':
                    args.push(node.value);
                    break;
                case 'function':
                    args.push(ConverterService.parseFunction(node));
                    break;
                default:
                    break;

            }
        }
        return `${nodeFun.value}(${args.join(',')})${nodeFun.alias ? ` AS ${nodeFun.alias}` : ''}`;
    }

    static parseGroupBy(group) {
        if (group) {
            const result = [];
            for (let i = 0, { length } = group; i < length; i++) {
                const node = group[i];
                switch (node.type) {

                    case 'literal':
                        result.push(`${node.value}`);
                        break;
                    case 'function':
                        result.push(ConverterService.parseFunction(node));
                        break;
                    default:
                        break;

                }
            }
            return `${result.join(',')}`;
        }
        return '';
    }

    static obtainFSFromAST(parsed) {
        logger.info('Generating FeatureService object from ast object');
        let fs = {};

        if (parsed.select && parsed.select.length > 0) {
            let outFields = '';
            const outStatistics = [];
            for (let i = 0, { length } = parsed.select; i < length; i++) {
                const node = parsed.select[i];
                if (node.type === 'function') {
                    if (node.value.toLowerCase() === 'count' && parsed.select.length === 1) {
                        fs.returnCountOnly = true;
                    } else {
                        if (node.value.toLowerCase() === 'count' && node.arguments[0].value === '*') {
                            throw new QueryNotValid(400, 'Invalid query. ArcGis does not support count(*) with more columns');
                        }
                        const obj = {
                            statisticType: node.value,
                            onStatisticField: node.arguments[0].value
                        };
                        if (node.alias) {
                            obj.outStatisticFieldName = node.alias;
                        }
                        outStatistics.push(obj);
                    }

                } else if (node.type === 'distinct') {
                    fs.returnDistinctValues = true;
                    fs.returnGeometry = false;
                    for (let j = 0, { length: argumentsLength } = node.arguments; j < argumentsLength; j++) {
                        const argument = node.arguments[j];
                        if (outFields !== '') {
                            outFields += ',';
                        }
                        outFields += argument.value;
                    }
                } else {
                    if (outFields !== '') {
                        outFields += ',';
                    }
                    outFields += node.value;
                }
            }
            if (outFields) {
                fs.outFields = outFields;
            }
            if (outStatistics && outStatistics.length > 0) {
                fs.outStatistics = JSON.stringify(outStatistics);
            }
        }
        if (parsed.from) {
            fs.tableName = parsed.from;
        }
        if (parsed.where) {
            fs = { ...fs, ...ConverterService.parseWhere(parsed.where) };
        } else {
            fs = { ...fs, where: '1=1' };
        }
        if (parsed.group && parsed.group.length > 0) {
            const groupByFieldsForStatistics = ConverterService.parseGroupBy(parsed.group);
            fs.groupByFieldsForStatistics = groupByFieldsForStatistics;
        }

        if (parsed.orderBy && parsed.orderBy.length > 0) {
            let orderByFields = '';
            for (let i = 0, { length } = parsed.orderBy; i < length; i++) {
                orderByFields += parsed.orderBy[i].value;
                if (parsed.orderBy[i].direction) {
                    orderByFields += ` ${parsed.orderBy[i].direction}`;
                }
                if (i < length - 1) {
                    orderByFields += ',';
                }
            }
            fs.orderByFields = orderByFields;
        }

        if (parsed.limit) {
            fs.resultRecordCount = parsed.limit;
            fs.supportsPagination = true;
        }
        if (parsed.geojson) {
            fs.geometryType = 'esriGeometryPolygon';
            fs.spatialRel = 'esriSpatialRelIntersects';
            fs.inSR = JSON.stringify({
                wkid: 4326
            });
            fs.geometry = JSON.stringify(geojsonToArcGIS(parsed.geojson.features[0].geometry));
        }
        return fs;
    }

    static async obtainGeoStore(id, apiKey) {
        logger.info('Obtaining geostore with id', id);
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: encodeURI(`/v1/geostore/${id}`),
                method: 'GET',
                json: true,
                headers: {
                    'x-api-key': apiKey,
                }
            });

            const geostore = await new JSONAPIDeserializer({
                keyForAttribute: 'camelCase'
            }).deserialize(result);
            if (geostore) {
                return geostore.geojson;
            }
        } catch (err) {
            if (err && err.statusCode === 404) {
                throw new Error('Geostore not found');
            }
            throw new Error('Error obtaining geostore');
        }

        return null;
    }

    static checkGeojson(geojson) {
        if (geojson.type.toLowerCase() === 'polygon') {
            return {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: geojson
                }]
            };
        }
        if (geojson.type.toLowerCase() === 'feature') {
            return {
                type: 'FeatureCollection',
                features: [geojson]
            };
        }
        return geojson;
    }

    static async sql2FS(params, apiKey) {
        const sql = params.sql.trim();
        logger.info('Creating featureservice from sql', sql);
        const parsed = new Sql2json(sql).toJSON();
        if (!parsed) {
            return SQLService.generateError('Malformed query');
        }
        let result = SQLService.checkSQL(parsed);
        if (result && result.error) {
            return result;
        }
        if (params.geojson) {
            const geojson = ConverterService.checkGeojson(params.geojson);
            parsed.geojson = geojson;
        }
        if (params.geostore) {
            const geojson = await ConverterService.obtainGeoStore(params.geostore, apiKey);
            parsed.geojson = geojson;
        }
        result = ConverterService.obtainFSFromAST(parsed);
        if (Object.prototype.hasOwnProperty.call(params, 'excludeGeometries') && (params.excludeGeometries === true || params.excludeGeometries === 'true')) {
            result.returnGeometry = false;
        }
        if (result && result.error) {
            return result;
        }
        return {
            fs: result,
            parsed
        };
    }

}

module.exports = ConverterService;
