const logger = require('logger');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const Sql2json = require('sql2json').sql2json;
const Json2sql = require('sql2json').json2sql;
const GeoStoreNotFound = require('errors/geoStoreNotFound');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

class SQLService {

    static generateError(message) {
        logger.warn(`Error found: ${message}`);
        return {
            error: true,
            message: `${message}`
        };
    }

    static correctSQL(ast) {
        if (ast.type !== 'select' && ast.type !== 'delete') {
            return SQLService.generateError(`Type ${ast.type} not allowed`);
        }
        if ((ast.join && ast.join.length > 0) || (ast.from && ast.from.length > 1)) {
            return SQLService.generateError(`Joins not allowed`);
        }
        return {
            error: false
        };
    }

    static checkSQL(parsed) {
        logger.info('Checking sql...');
        if (parsed && ((parsed.select && parsed.select.length > 0) || parsed.delete) && parsed.from) {
            logger.info('Valid sql!');
            return {
                error: false
            };
        }
        return SQLService.generateError('Malformed query');
    }

    static async obtainGeoStore(id) {
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: encodeURI(`/v1/geostore/${id}`),
                method: 'GET',
                json: true
            });

            const geostore = await new JSONAPIDeserializer({
                keyForAttribute: 'camelCase'
            }).deserialize(result);
            if (geostore) {
                return geostore;
            }
        } catch (err) {
            logger.warn('Error obtaining geostore', err);
            if (err && err.statusCode === 404) {
                throw new GeoStoreNotFound(404, 'Geostore not found');
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

    static async sql2SQL(data, isRaster = false, experimental = false) {
        logger.debug('Converting sql to sql', data);
        const parsed = new Sql2json(data.sql, experimental).toJSON();
        if (!parsed) {
            return SQLService.generateError('Malformed query');
        }
        if (data.geostore || data.geojson) {
            let geojson = null;
            if (data.geojson) {
                geojson = SQLService.checkGeojson(data.geojson);
            }
            if (data.geostore) {
                logger.debug('Contain geostore. Obtaining geojson');
                const geostore = await SQLService.obtainGeoStore(data.geostore);
                logger.debug('Completing query');
                geojson = geostore.geojson;
            }
            let intersect = null;
            if (isRaster) {
                intersect = {
                    type: 'function',
                    value: 'ST_INTERSECTS',
                    arguments: [{
                        type: 'function',
                        value: 'ST_SetSRID',
                        arguments: [{
                            type: 'function',
                            value: 'ST_GeomFromGeoJSON',
                            arguments: [{
                                type: 'string',
                                value: `${JSON.stringify(geojson.features[0].geometry)}`
                            }],
                        }, {
                            type: 'number',
                            value: 4326
                        }]
                    }, {
                        type: 'function',
                        value: 'ST_Transform',
                        arguments: [{
                            type: 'literal',
                            value: 'the_raster_webmercator'
                        }, {
                            type: 'number',
                            value: 4326
                        }]
                    }]
                };
            } else {
                intersect = {
                    type: 'function',
                    value: 'ST_INTERSECTS',
                    arguments: [{
                        type: 'function',
                        value: 'ST_SetSRID',
                        arguments: [{
                            type: 'function',
                            value: 'ST_GeomFromGeoJSON',
                            arguments: [{
                                type: 'string',
                                value: `${JSON.stringify(geojson.features[0].geometry)}`
                            }],
                        }, {
                            type: 'number',
                            value: 4326
                        }]
                    }, {
                        type: 'literal',
                        value: 'the_geom'
                    }]
                };
            }
            if (parsed.where) {
                parsed.where = {
                    type: 'conditional',
                    value: 'and',
                    left: intersect,
                    right: parsed.where
                };
            } else {
                parsed.where = intersect;
            }
        }
        logger.debug('Sql converted successfully, checking for validity');

        const result = SQLService.checkSQL(parsed);
        if (!result || result.error) {
            logger.warn(`Error checking sql for parsed query: ${parsed}`);
            return result;
        }
        const jsonToSql = Json2sql.toSQL(parsed);

        logger.info(`Returning converted sql: ${jsonToSql}`);

        return {
            sql: jsonToSql,
            parsed
        };
    }

}

module.exports = SQLService;
