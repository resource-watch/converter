'use strict';

var simpleSqlParser = require('simple-sql-parser');
var logger = require('logger');

class SQLService {
    static generateError( message){
        logger.debug(message);
        return {
            error: true,
            message: `${message}`
        };
    }

    static correctSQL(ast){
        if (ast.type !== 'select') {
            return SQLService.generateError(`Type ${ast.type} not allowed`);
        }
        if((ast.join && ast.join.length > 0) || (ast.from && ast.from.length > 1) ){
            return SQLService.generateError(`Joins not allowed`);
        }
        return {
            error: false
        };
    }

    static checkSQL(sql){
        logger.info('Checking sql ', sql);
        let ast = simpleSqlParser.sql2ast(sql);
        if (!ast.status){
            return SQLService.generateError('Malformed query');
        }
        return SQLService.correctSQL(ast.value);
    }

    static obtainASTFromSQL(sql){
        let ast = simpleSqlParser.sql2ast(sql);
        if (!ast.status){
            return SQLService.generateError('Malformed query');
        }
        return {
            error: false,
            ast: ast.value
        };
    }
}

module.exports = SQLService;
