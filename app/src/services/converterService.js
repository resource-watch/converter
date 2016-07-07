'use strict';

var logger = require('logger');
var SQLService = require('services/sqlService');

let aggrFunctions = ['count', 'sum', 'min', 'max', 'avg', 'stddev', 'var'];
let aggrFunctionsRegex = /(count|sum|min|max|avg|stddev|var){1}[A-Za-z0-9_]*/g;
let obtainColAggrRegex = /\((.*?)\)/g;

class ConverterService {

    static obtainSelect(fs){
        let result = '';
        if(!fs.select && !fs.outStatistics){
            return '*';
        }
        if(fs.select){
            result = fs.select;
        }
        if(fs.outStatistics){
            try{

                let statistics = JSON.parse(fs.outStatistics);
                if(statistics){
                    for(let i=0, length = statistics.length; i < length; i++){
                        result += `, ${statistics[i].statisticType}(${statistics[i].onStatisticField}) ${statistics[i].outStatisticFieldName ? ` AS ${statistics[i].outStatisticFieldName} `: ''}`;
                    }
                }
            } catch(err){
                logger.error('Parse error:', err);
                throw err;
            }
        }
        return result;
    }

    static fs2SQL(fs, tableName){
        logger.info('Creating query from featureService');
        let sql = `SELECT ${ConverterService.obtainSelect(fs)} FROM ${tableName}
                ${fs.where ? `WHERE ${fs.where}` : ''}
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

    static obtainFSFromAST(ast){
        aggrFunctionsRegex.lastIndex = 0;
        obtainColAggrRegex.lastIndex = 0;
        logger.info('Generating FeatureService object from ast object');
        let fs = {};
        if(ast.select && ast.select.length > 0){
            let select = '';
            let outStatistics = [];
            for(let i = 0, length = ast.select.length; i < length; i++){

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
                    if(select !== ''){
                        select += ',';
                    }
                    select += ast.select[i].expression;
                }

            }
            fs.select = select;
            if(outStatistics && outStatistics.length > 0){
                fs.outStatistics = JSON.stringify(outStatistics);
            }
        }
        if(ast.from){
            fs.tableName = ast.from[0].expression;
        }
        if(ast.where){
            fs.where = ast.where.expression;
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
