'use strict';

var logger = require('logger');
var SQLService = require('services/sqlService');

const aggrFunctions = ['count', 'sum', 'min', 'max', 'avg', 'stddev', 'var'];
const aggrFunctionsRegex = /(count *\(|sum\(|min\(|max\(|avg\(|stddev\(|var\(){1}[A-Za-z0-9_]*/g;
const OBTAIN_GEOJSON = /[.]*st_geomfromgeojson*\( *['|"]([^\)]*)['|"] *\)/g;
const CONTAIN_INTERSEC = /[.]*([and | or]*st_intersects.*)\)/g;
const obtainColAggrRegex = /\((.*?)\)/g;

class ConverterService {

    static obtainSelect(fs){
        let result = '';
        if(!fs.outFields && !fs.outStatistics){
            return '*';
        }
        if(fs.outFields){
            result = fs.outFields;
        }
        if(fs.outStatistics){
            try{

                let statistics = JSON.parse(fs.outStatistics);
                if(statistics){
                    for(let i=0, length = statistics.length; i < length; i++){
                        if(result){
                            result += ', ';
                        }
                        result += `${statistics[i].statisticType}(${statistics[i].onStatisticField}) ${statistics[i].outStatisticFieldName ? ` AS ${statistics[i].outStatisticFieldName} `: ''}`;
                    }
                }
            } catch(err){
                logger.error('Parse error:', err);
                throw err;
            }
        }
        return result;
    }

    static obtainWhere(fs) {
        logger.debug(fs);
        let where = '';
        if (fs.where) {
            if (!where){
                where = 'WHERE ';
            }
            where += fs.where;
        }
        if (fs.geometry) {
            if (!where){
                where = 'WHERE ';
            } else {
                where += ' AND ';
            }
            where += `ST_INTERSECTS(the_geom, ST_SETSRID(ST_GeomFromGeoJSON('${fs.geometry}'), 4326))`;
        }
        return where;
    }

    static fs2SQL(fs, tableName){
        logger.info('Creating query from featureService');
        let sql = `SELECT ${ConverterService.obtainSelect(fs)} FROM ${tableName}
                ${ConverterService.obtainWhere(fs)}
                ${fs.groupByFieldsForStatistics ? `GROUP BY ${fs.groupByFieldsForStatistics} `:'' }
                ${fs.orderByFields ? `ORDER BY ${fs.orderByFields} `: ''}
                ${fs.resultRecordCount ? `LIMIT ${fs.resultRecordCount }`: ''}`.replace(/\s\s+/g, ' ').trim();
        let result = SQLService.checkSQL(sql);
        if(result && result.error){
            return result;
        }
        return {
            sql: sql
        };
    }

    static obtainAggrFun(exp){
        if (exp) {
            for (let i = 0, length = aggrFunctions.length; i < length; i++) {
                if(exp.startsWith(aggrFunctions[i])) {
                    return aggrFunctions[i];
                }
            }
        }
        return null;
    }

    static convertGeoJSONToEsriGJSON(geojson) {
        if(geojson.type === 'Polygon'){
            geojson.rings = geojson.coordinates;
            delete geojson.coordinates;
        } else if(geojson.type === 'MultiPolygon') {
            geojson.rings = geojson.coordinates[0];
            delete geojson.coordinates;
        }
        geojson.type = 'polygon';
        return geojson;
    }

    static parseWhere(where) {
        logger.debug('Parsing where', where);
        CONTAIN_INTERSEC.lastIndex = 0;
        OBTAIN_GEOJSON.lastIndex = 0;
        const whereLower = where.toLowerCase();
        const result = {
            where,
        };
        if (CONTAIN_INTERSEC.test(whereLower)) {
            logger.debug('Contain intersec');
            CONTAIN_INTERSEC.lastIndex = 0;
            let resultIntersec = CONTAIN_INTERSEC.exec(whereLower)[0];
            let pos = whereLower.indexOf(resultIntersec);
            result.where = `${where.substring(0, pos)} ${where.substring(pos + resultIntersec.length, where.length)}`.trim();
            if (!result.where) {
                delete result.where;
            }
            let geojson = OBTAIN_GEOJSON.exec(whereLower);
            if (geojson && geojson.length > 1){
                result.spatialRel = 'esriSpatialRelIntersects';
                result.geometryType = 'esriGeometryPolygon';
                result.inSR = JSON.stringify({
                    wkid: 4326
                });
                console.log(geojson[0]);
                result.geometry = JSON.stringify(ConverterService.convertGeoJSONToEsriGJSON(JSON.parse(geojson[1])));
            }
        }

        return result;
    }

    static obtainFSFromAST(ast){
        logger.info('Generating FeatureService object from ast object');
        let fs = {};

        if(ast.select && ast.select.length > 0){
            let outFields = '';
            let outStatistics = [];
            for(let i = 0, length = ast.select.length; i < length; i++){
                obtainColAggrRegex.lastIndex = 0;
                aggrFunctionsRegex.lastIndex = 0;
                if(aggrFunctionsRegex.test(ast.select[i].expression)){
                    //aggr function
                    let parts = obtainColAggrRegex.exec(ast.select[i].expression);
                    let obj = null;
                    if(parts && parts.length > 1){
                        obj = {
                            onStatisticField: parts[1],
                            statisticType: ConverterService.obtainAggrFun(ast.select[i].expression)
                        };
                        if(ast.select[i].alias){
                            obj.outStatisticFieldName = ast.select[i].alias;
                        }
                        outStatistics.push(obj);
                    } else {
                        return {
                            error: true,
                            message: 'Query malformed. Function not found'
                        };
                    }
                } else {
                    if(outFields !== ''){
                        outFields += ',';
                    }
                    outFields += ast.select[i].expression;
                }

            }
            if(outFields) {
                fs.outFields = outFields;
            }
            if(outStatistics && outStatistics.length > 0){
                fs.outStatistics = JSON.stringify(outStatistics);
            }
        }
        if(ast.from){
            fs.tableName = ast.from[0].expression;
        }
        if(ast.where){
            fs = Object.assign({}, fs, ConverterService.parseWhere(ast.where.expression));
        }
        if(ast.group && ast.group.length > 0){
            let groupByFieldsForStatistics = '';
            for(let i = 0, length = ast.group.length; i < length; i++){
                groupByFieldsForStatistics += ast.group[i].expression;
                if(i < length -1){
                    groupByFieldsForStatistics += ',';
                }
            }
            fs.groupByFieldsForStatistics = groupByFieldsForStatistics;
        }

        if(ast.order && ast.order.length > 0){
            let orderByFields = '';
            for(let i = 0, length = ast.order.length; i < length; i++){
                orderByFields += ast.order[i].expression;
                if(i < length -1){
                    orderByFields += ',';
                }
            }
            fs.orderByFields = orderByFields;
        }

        if(ast.limit){
            fs.resultRecordCount = ast.limit.nb;
            fs.supportsPagination = true;
        }
        return fs;
    }

    static sql2FS(sql){
        logger.info('Creating featureservice from sql %s', sql);
        let result = SQLService.checkSQL(sql);
        if(result && result.error){
            return result;
        }
        result = SQLService.obtainASTFromSQL(sql);
        if(result && result.error){
            return result;
        }
        result = ConverterService.obtainFSFromAST(result.ast);
        if(result && result.error){
            return result;
        }
        return {
            fs: result
        };
    }
}

module.exports = ConverterService;
