'use strict';

var simpleSqlParser = require('simple-sql-parser');
var logger = require('logger');
var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const Sql2json = require('sql2json').sql2json;
const Json2sql = require('sql2json').json2sql;
const GeoStoreNotFound = require('errors/geoStoreNotFound');

var deserializer = function (obj) {
  return function (callback) {
    new JSONAPIDeserializer({
      keyForAttribute: 'camelCase'
    }).deserialize(obj, callback);
  };
};


class SQLService {
  static generateError(message) {
    logger.debug(message);
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
    logger.info('Checking sql ');
    if (parsed && ((parsed.select && parsed.select.length > 0) || parsed.delete) && parsed.from) {
      return {
        error: false
      };
    }
    return SQLService.generateError('Malformed query');
  }

  static obtainASTFromSQL(sql) {
    let ast = simpleSqlParser.sql2ast(sql);
    if (!ast.status) {
      return SQLService.generateError('Malformed query');
    }
    return {
      error: false,
      ast: ast.value
    };
  }

  static * obtainGeoStore(id) {
    try {
      let result = yield require('ct-register-microservice-node').requestToMicroservice({
        uri: encodeURI(`/geostore/${id}`),
        method: 'GET',
        json: true
      });

      let geostore = yield deserializer(result);
      if (geostore) {
        return geostore;
      }
    } catch (err) {
      logger.error('Error obtaining geostore', err);
      if (err && err.statusCode === 404) {
        throw new GeoStoreNotFound(404, 'Geostore not found');
      }
      throw new Error('Error obtaining geostore');
    }
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
    } else if (geojson.type.toLowerCase() === 'feature') {
      return {
        type: 'FeatureCollection',
        features: [geojson]
      };
    }
    return geojson;
  }

  static * sql2SQL(data, isRaster = false, experimental= false) {
    logger.debug('Converting sql to sql', data);
    let parsed = new Sql2json(data.sql, experimental).toJSON();
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
        let geostore = yield SQLService.obtainGeoStore(data.geostore);
        logger.debug('Completing query');
        geojson = geostore.geojson;
      }

      const intersect = {
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
              value: `'${JSON.stringify(geojson.features[0].geometry)}'`
            }],
          }, {
            type: 'number',
            value: 4326
          }]
        }, {
          type: 'literal',
          value: !isRaster ? 'the_geom' : 'the_raster_webmercator'
        }]
      };
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
    logger.debug('sql converted!');

    const result = SQLService.checkSQL(parsed);
    if (!result || result.error) {
      return result;
    }
    return {
      sql: Json2sql.toSQL(parsed),
      parsed
    };
  }
}

module.exports = SQLService;
