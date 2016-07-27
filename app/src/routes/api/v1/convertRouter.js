'use strict';

var Router = require('koa-router');
var logger = require('logger');
var ConverterService = require('services/converterService');
var SQLService = require('services/sqlService');
var ResultSerializer = require('serializers/resultSerializer');
var router = new Router({
    prefix: '/api/v1/convert'
});


class ConvertRouter {

    static convertFSObjectToQuery(fs){
        logger.debug('Converting fs to queryparams');
        let query = '';
        if(fs){
            let keys = Object.keys(fs);

            for(let i = 0, length = keys.length; i < length; i++){
                if(i === 0){
                    query +=`?${keys[i]}=${fs[keys[i]]}`;
                }else {
                    query +=`&${keys[i]}=${fs[keys[i]]}`;
                }
            }
        }
        return query;
    }


    static * fs2SQL() {
        logger.info('FS2SQL with queryparams ', this.query);
        let result = ConverterService.fs2SQL(this.query, this.query.tableName);
        if (result && result.error) {
            this.throw(400, result.message);
            return;
        }
        this.body = ResultSerializer.serialize({
            query: result.sql
        });
    }

    static * sql2FS() {
        logger.info('SQL2FS with sql ', this.query.sql);
        this.assert(this.query.sql, 400, 'Sql param required');
        let result = ConverterService.sql2FS(this.query.sql);
        if (result && result.error) {
            this.throw(400, result.message);
            return;
        }
        this.body = ResultSerializer.serialize({
            query: ConvertRouter.convertFSObjectToQuery(result.fs)
        });
    }

    static * checkSQL() {
        logger.info('CheckSQL with sql ', this.query.sql);
        this.assert(this.query.sql, 400, 'Sql param required');
        let result = SQLService.checkSQL(this.query.sql);
        if (result && result.error) {
            this.throw(400, result.message);
            return;
        }
        this.body = ResultSerializer.serialize({
            query: this.query.sql
        });
    }

}

router.get('/fs2SQL', ConvertRouter.fs2SQL);
router.get('/sql2FS', ConvertRouter.sql2FS);
router.get('/checkSQL', ConvertRouter.checkSQL);


module.exports = router;
