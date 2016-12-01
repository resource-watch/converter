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

  static convertFSObjectToQuery(fs) {
    logger.debug('Converting fs to queryparams');
    let query = '';
    if (fs) {
      let keys = Object.keys(fs);

      for (let i = 0, length = keys.length; i < length; i++) {
        if (i === 0) {
          query += `?${keys[i]}=${fs[keys[i]]}`;
        } else {
          query += `&${keys[i]}=${fs[keys[i]]}`;
        }
      }
    }
    return query;
  }


  static * fs2SQL() {    
    logger.info('FS2SQL with sql ');
    let params = Object.assign({}, this.request.body, this.query);
    this.assert(params.tableName, 400, 'TableName is required');
    
    let result = yield ConverterService.fs2SQL(params);
    if (result && result.error) {
      this.throw(400, result.message);
      return;
    }
    this.body = ResultSerializer.serialize({
      query: result.sql
    });
  }

  static * sql2FS() {
    logger.info('SQL2FS with sql ');
    let params = Object.assign({}, this.request.body, this.query);
    this.assert(params.sql, 400, 'SQL param is required');
    params.sql = params.sql.replace(/  +/g, '').trim(); // hack: TODO: fix the parser to support several spaces
    let result = yield ConverterService.sql2FS(params);
    if (result && result.error) {
      this.throw(400, result.message);
      return;
    }
    this.body = ResultSerializer.serialize({
      query: ConvertRouter.convertFSObjectToQuery(result.fs),
      fs: result.fs
    });
  }

  static * checkSQL() {
    logger.info('CheckSQL with sql ');
    let params = Object.assign({}, this.request.body, this.query);
    this.assert(params.sql, 400, 'SQL param is required');
    params.sql = params.sql.replace(/  +/g, '');
    let result = SQLService.checkSQL(params.sql.trim());
    if (result && result.error) {
      this.throw(400, result.message);
      return;
    }
    this.body = ResultSerializer.serialize({
      query: this.query.sql
    });
  }

  static * sql2SQL() {
    logger.info('Converting sql to sql');    
    
    let params = Object.assign({}, this.request.body, this.query);
    this.assert(params.sql, 400, 'SQL param is required');
    params.sql = params.sql.replace(/  +/g, '').trim(); // hack: TODO: fix the parser to support several spaces
    let sql = yield SQLService.sql2SQL(params);
    let result = SQLService.checkSQL(sql);
    if (result && result.error) {
      this.throw(400, result.message);
      return;
    }
    this.body = ResultSerializer.serialize({
      query: sql
    });
  }

}

router.get('/fs2SQL', ConvertRouter.fs2SQL);
router.post('/fs2SQL', ConvertRouter.fs2SQL);
router.get('/sql2FS', ConvertRouter.sql2FS);
router.post('/sql2FS', ConvertRouter.sql2FS);
router.get('/checkSQL', ConvertRouter.checkSQL);
router.get('/sql2SQL', ConvertRouter.sql2SQL);
router.post('/sql2SQL', ConvertRouter.sql2SQL);


module.exports = router;
