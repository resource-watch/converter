'use strict';

var simpleSqlParser = require('simple-sql-parser');
var logger = require('logger');
var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;

var deserializer = function(obj) {
  return function(callback) {
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
    if (ast.type !== 'select') {
      return SQLService.generateError(`Type ${ast.type} not allowed`);
    }
    if ((ast.join && ast.join.length > 0) || (ast.from && ast.from.length > 1)) {
      return SQLService.generateError(`Joins not allowed`);
    }
    return {
      error: false
    };
  }

  static checkSQL(sql) {
    logger.info('Checking sql ', sql);
    let ast = simpleSqlParser.sql2ast(sql);
    if (!ast.status) {
      logger.debug(ast);
      return SQLService.generateError('Malformed query');
    }
    return SQLService.correctSQL(ast.value);
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
    } catch(err){
      logger.error('Error obtaining geostore', err);
      if (err && err.statusCode === 404) {
        throw new Error('Geostore not found');
      } 
      throw new Error('Error obtaining geostore');
    }
  }

  static * sql2SQL(data) {
    logger.debug('Converting sql to sql', data);
    if (data.geostore) {
      logger.debug('Contain geostore. Obtaining geojson');
      let geostore = yield SQLService.obtainGeoStore(data.geostore);
      logger.debug('Completing query');
      let ast = simpleSqlParser.sql2ast(data.sql);
      if (!ast.status) {
        return SQLService.generateError('Malformed query');
      }
      const intersection = `ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(geostore.geojson.features[0].geometry)}'), 4326), the_geom)`;
      logger.debug('ast', ast);
      if (ast.value.where) {
        ast.value.where.expression += ' AND ' + intersection;
      } else {
        ast.value.where = {
          expression: intersection
        };
      }
      var query = simpleSqlParser.ast2sql(ast);
      data.sql = query;

    }
    logger.debug('sql converted!');
    return data.sql;
  }
}

module.exports = SQLService;
