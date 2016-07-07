'use strict';

var Router = require('koa-router');
var logger = require('logger');
var ConverterService = require('services/converterService');
var router = new Router({
    prefix: '/api/v1/converter'
});


class ConvertRouter {

    static * fs2SQL() {
        logger.info('FS2SQL with queryparams ', this.query);
        let result = ConverterService.fs2SQL();
        if(result && result.error){
            this.throw(400, {error: result.message});
            return;
        }
        this.body = result;
    }


}


router.get('/fs2SQL', ConvertRouter.fs2SQL);


module.exports = router;
