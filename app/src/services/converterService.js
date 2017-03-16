'use strict';

var logger = require('logger');
var SQLService = require('services/sqlService');
var geojsonToArcGIS = require('arcgis-to-geojson-utils').geojsonToArcGIS;
var arcgisToGeoJSON = require('arcgis-to-geojson-utils').arcgisToGeoJSON;
const Sql2json = require('sql2json').sql2json;
const Json2sql = require('sql2json').json2sql;
const QueryNotValid = require('errors/queryNotValid');

const aggrFunctions = ['count', 'sum', 'min', 'max', 'avg', 'stddev', 'var'];
const aggrFunctionsRegex = /(count *\(|sum\(|min\(|max\(|avg\(|stddev\(|var\(){1}[A-Za-z0-9_]*/g;
const OBTAIN_GEOJSON = /[.]*st_geomfromgeojson*\( *['|"]([^\)]*)['|"] *\)/g;
const CONTAIN_INTERSEC = /[.]*([and | or]*st_intersects.*)\)/g;
const obtainColAggrRegex = /\((.*?)\)/g;

var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;

var deserializer = function (obj) {
  return function (callback) {
    new JSONAPIDeserializer({
      keyForAttribute: 'camelCase'
    }).deserialize(obj, callback);
  };
};

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

        let statistics = JSON.parse(fs.outStatistics);
        if (statistics) {
          for (let i = 0, length = statistics.length; i < length; i++) {
            if (result) {
              result += ', ';
            }
            result += `${statistics[i].statisticType}(${statistics[i].onStatisticField}) ${statistics[i].outStatisticFieldName ? ` AS ${statistics[i].outStatisticFieldName} `: ''}`;
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

  static * obtainWhere(params) {
    let fs = params;
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
      let esrigeojson = JSON.parse(fs.geometry.replace(/\\"/g, '"'));
      let wkid = fs.inSR ? JSON.parse(fs.inSR.replace(/\\"/g, '"')) : null;
      wkid = wkid.wkid || 4326;

      let geojson = arcgisToGeoJSON(esrigeojson);
      where += `ST_INTERSECTS(the_geom, ST_SETSRID(ST_GeomFromGeoJSON('${JSON.stringify(geojson.geometry || geojson)}'), ${wkid}))`;
    } else if (params.geostore) {
      let geojson = yield ConverterService.obtainGeoStore(params.geostore);
      if (!where) {
        where = 'WHERE ';
      } else {
        where += ' AND ';
      }
      where += `ST_INTERSECTS(the_geom, ST_SETSRID(ST_GeomFromGeoJSON('${JSON.stringify(geojson.features[0].geometry)}'), 4326))`;
    }
    return where;
  }

  static * fs2SQL(params) {
    let fs = params;
    logger.info('Creating query from featureService', params);
    let where = yield ConverterService.obtainWhere(params);
    let sql = `SELECT ${ConverterService.obtainSelect(fs)} FROM ${params.tableName}
                ${where}
                ${fs.groupByFieldsForStatistics ? `GROUP BY ${fs.groupByFieldsForStatistics} `:'' }
                ${fs.orderByFields ? `ORDER BY ${fs.orderByFields} `: ''}
                ${fs.resultRecordCount ? `LIMIT ${fs.resultRecordCount }`: ''}`.replace(/\s\s+/g, ' ').trim();

    let parsed = new Sql2json(sql).toJSON();
    if (!parsed) {
      return SQLService.generateError('Malformed query');
    }
    let result = SQLService.checkSQL(parsed);

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
      for (let i = 0, length = aggrFunctions.length; i < length; i++) {
        if (exp.startsWith(aggrFunctions[i]))  {
          return aggrFunctions[i];
        }
      }
    }
    return null;
  }

  static convertGeoJSONToEsriGJSON(geojson)  {
    if (geojson.type === 'polygon') {
      geojson.rings = geojson.coordinates;
      delete geojson.coordinates;
    } else if (geojson.type === 'multipolygon') {
      geojson.rings = geojson.coordinates[0];
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
      } else if (!right)  {
        return node.left;
      }
    }
    return node;
  }

  static findIntersect(node, finded, result) {
    if (node && node.type === 'string' && node.value && finded) {
      try {
        const geojson = JSON.parse(node.value);
        if (!result) {
          result = {};
        }
        result.geojson = geojson;
        return result;
      } catch (e) {
        return result;
      }
    }
    if (node && node.type === 'number' && node.value && finded) {
      if (!result) {
        result = {};
      }
      result.wkid = node.value;
      return result;
    }
    if (node && node.type === 'function' && (node.value.toLowerCase() === 'st_intersects' || finded)) {
      for (let i = 0, length = node.arguments.length; i < length; i++) {
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
      } else if (right)  {
        return right;
      }
    }
    return null;
  }

  static parseWhere(where) {
    logger.debug('Parsing where', where);
    let geo = ConverterService.findIntersect(where);
    let fs = {};
    if (geo) {
      fs.geometryType = 'esriGeometryPolygon';
      fs.spatialRel = 'esriSpatialRelIntersects';
      fs.inSR = JSON.stringify({
        wkid: geo.wkid
      });
      fs.geometry = JSON.stringify(geojsonToArcGIS(geo.geojson));
      let pruneWhere = ConverterService.removeIntersect(where);
      if (pruneWhere) {
        fs.where = Json2sql.parseNodeWhere(pruneWhere);
      }
    } else {
      fs.where = Json2sql.parseNodeWhere(where);
    }
    return fs;
  }

  static parseFunction(nodeFun) {
    const args = [];
    for (let i = 0, length = nodeFun.arguments.length; i < length; i++) {
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
        for (let i = 0, length = group.length; i < length; i++) {
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
      let outStatistics = [];
      for (let i = 0, length = parsed.select.length; i < length; i++) {
        const node = parsed.select[i];
        if (node.type === 'function') {
          if (node.value.toLowerCase() === 'count' && parsed.select.length === 1) {
            fs.returnCountOnly = true;
          } else {
            if (node.value.toLowerCase() === 'count' && node.arguments[0].value === '*'){
              throw new QueryNotValid(400, 'Invalid query. ArcGis does not support count(*) with more columns');
            }
            let obj = {
              statisticType: node.value,
              onStatisticField: node.arguments[0].value
            };
            if (node.alias) {
              obj.outStatisticFieldName = node.alias;
            }
            outStatistics.push(obj);
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
      fs = Object.assign({}, fs, ConverterService.parseWhere(parsed.where));
    } else {
      fs = Object.assign({}, fs, {where: '1=1'});
    }
    if (parsed.group && parsed.group.length > 0) {
      let groupByFieldsForStatistics = ConverterService.parseGroupBy(parsed.group);
      fs.groupByFieldsForStatistics = groupByFieldsForStatistics;
    }

    if (parsed.orderBy && parsed.orderBy.length > 0) {
      let orderByFields = '';
      for (let i = 0, length = parsed.orderBy.length; i < length; i++) {
        orderByFields += parsed.orderBy[i].value;
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
    if (parsed.geostore) {
      fs.geometryType = 'esriGeometryPolygon';
      fs.spatialRel = 'esriSpatialRelIntersects';
      fs.inSR = JSON.stringify({
        wkid: 4326
      });
      fs.geometry = JSON.stringify(geojsonToArcGIS(parsed.geostore.features[0].geometry));
    }
    return fs;
  }

  static * obtainGeoStore(id) {
    logger.info('Obtaining geostore with id', id);
    try {
      let result = yield require('ct-register-microservice-node').requestToMicroservice({
        uri: encodeURI(`/geostore/${id}`),
        method: 'GET',
        json: true
      });

      let geostore = yield deserializer(result);
      if (geostore) {
        return geostore.geojson;
      }
    } catch (err) {
      if (err && err.statusCode === 404) {
        throw new Error('Geostore not found');
      }
      throw new Error('Error obtaining geostore');
    }
  }

  static * sql2FS(params) {
    let sql = params.sql.trim();
    logger.info('Creating featureservice from sql', sql);
    let parsed = new Sql2json(sql).toJSON();
    if (!parsed) {
      return SQLService.generateError('Malformed query');
    }
    let result = SQLService.checkSQL(parsed);
    if (result && result.error) {
      return result;
    }

    if (params.geostore) {
      let geostore = yield ConverterService.obtainGeoStore(params.geostore);
      parsed.geostore = geostore;
    }
    result = ConverterService.obtainFSFromAST(parsed);
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
