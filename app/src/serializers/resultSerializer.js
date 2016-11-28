'use strict';

var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var resultSerializer = new JSONAPISerializer('result', {
    attributes: ['query', 'fs'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    },
    fs: {
      attributes: ['outStatistics', 'tableName', 'geometryType', 'geometry', 'outFields', 'groupByFieldsForStatistics', 'orderByFields', 'resultRecordCount', 'supportsPagination', 'spatialRel', 'inSR', 'where' ],
    },
    keyForAttribute: 'camelCase'
});

class ResultSerializer {
    static serialize(data){
        return resultSerializer.serialize(data);
    }
}



module.exports = ResultSerializer;
