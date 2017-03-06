'use strict';

var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var resultSerializer = new JSONAPISerializer('result', {
    attributes: ['query', 'fs', 'jsonSql'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    },
    fs: {
      attributes: ['outStatistics', 'tableName', 'geometryType', 'geometry', 'outFields', 'groupByFieldsForStatistics', 'orderByFields', 'resultRecordCount', 'supportsPagination', 'spatialRel', 'inSR', 'where', 'returnCountOnly', 'outStatisticFieldName' ],
    },
    jsonSql: {
      attributes: ['select', 'from', 'delete', 'where', 'group', 'orderBy', 'limit', 'offset']
    },
    keyForAttribute: 'camelCase'
});

class ResultSerializer {
    static serialize(data){
        return resultSerializer.serialize(data);
    }
}



module.exports = ResultSerializer;
