const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const resultSerializer = new JSONAPISerializer('result', {
    attributes: ['query', 'fs', 'jsonSql'],
    typeForAttribute(attribute) {
        return attribute;
    },
    fs: {
        attributes: [
            'returnGeometry', 'returnDistinctValues', 'outStatistics', 'tableName', 'geometryType',
            'geometry', 'outFields', 'groupByFieldsForStatistics', 'orderByFields', 'resultRecordCount',
            'supportsPagination', 'spatialRel', 'inSR', 'where', 'returnCountOnly', 'outStatisticFieldName'
        ],
    },
    jsonSql: {
        attributes: ['select', 'from', 'delete', 'where', 'group', 'orderBy', 'limit', 'offset']
    },
    keyForAttribute: 'camelCase'
});

class ResultSerializer {

    static serialize(data) {
        return resultSerializer.serialize(data);
    }

}


module.exports = ResultSerializer;
