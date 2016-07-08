'use strict';

var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var resultSerializer = new JSONAPISerializer('result', {
    attributes: ['sql', 'fs'],
    typeForAttribute: function(attribute, record) {
        return attribute;
    }
});

class ResultSerializer {
    static serialize(data){
        return resultSerializer.serialize(data);
    }
}



module.exports = ResultSerializer;
