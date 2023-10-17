const Router = require('koa-router');
const logger = require('logger');
const ConverterService = require('services/converterService');
const SQLService = require('services/sqlService');
const ResultSerializer = require('serializers/resultSerializer');
const Sql2json = require('sql2json').sql2json;
const Json2sql = require('sql2json').json2sql;

const router = new Router({
    prefix: '/convert'
});

const hack = (sql) => sql.replace(/  +/g, ' ').replace(/\(\s\s*'/g, '(\'').replace(/\(\s\s*"/g, '("').trim();

class ConvertRouter {

    static convertFSObjectToQuery(fs) {
        logger.debug('Converting fs to queryparams');
        let query = '';
        if (fs) {
            const keys = Object.keys(fs);

            for (let i = 0, { length } = keys; i < length; i++) {
                if (i === 0) {
                    query += `?${keys[i]}=${fs[keys[i]]}`;
                } else {
                    query += `&${keys[i]}=${fs[keys[i]]}`;
                }
            }
        }
        return query;
    }

    static async fs2SQL(ctx) {
        logger.info('FS2SQL with sql ');
        const params = { ...ctx.request.body, ...ctx.query };
        ctx.assert(params.tableName, 400, 'TableName is required');

        const result = await ConverterService.fs2SQL(params, ctx.request.headers['x-api-key']);
        if (result && result.error) {
            ctx.throw(400, result.message);
            return;
        }
        ctx.body = ResultSerializer.serialize({
            query: result.query,
            jsonSql: result.parsed
        });
    }

    static async sql2FS(ctx) {
        logger.info('SQL2FS with sql ');
        const params = { ...ctx.request.body, ...ctx.query };
        ctx.assert(params.sql, 400, 'SQL param is required');
        params.sql = hack(params.sql); // hack: TODO: fix the parser to support several spaces
        const result = await ConverterService.sql2FS(params, ctx.request.headers['x-api-key']);
        if (result && result.error) {
            ctx.throw(400, result.message);
            return;
        }
        ctx.body = ResultSerializer.serialize({
            query: ConvertRouter.convertFSObjectToQuery(result.fs),
            fs: result.fs,
            jsonSql: result.parsed
        });
    }

    static async checkSQL(ctx) {
        logger.info('CheckSQL with sql ');
        const params = { ...ctx.request.body, ...ctx.query };
        ctx.assert(params.sql, 400, 'SQL param is required');
        const parsed = new Sql2json(params.sql).toJSON();
        if (!parsed) {
            return SQLService.generateError('Malformed query');
        }

        const result = SQLService.checkSQL(parsed);
        if (result && result.error) {
            ctx.throw(400, result.message);
            return null;
        }
        ctx.body = ResultSerializer.serialize({
            query: Json2sql.toSQL(parsed),
            jsonSql: parsed
        });

        return null;
    }

    static async sql2SQL(ctx) {
        logger.info('Converting sql to sql');

        const params = { ...ctx.request.body, ...ctx.query };
        ctx.assert(params.sql, 400, 'SQL param is required');

        let result;

        try {
            result = await SQLService.sql2SQL(params, ctx.request.headers['x-api-key'], ctx.query.raster === 'true', ctx.query.experimental);
        } catch (err) {
            logger.error(`Error converting query using sql2SQL service: ${err}`);
            err.status = 400;
            throw err;
        }

        if (result && result.error) {
            ctx.throw(400, result.message);
            return;
        }
        ctx.body = ResultSerializer.serialize({
            query: result.sql,
            jsonSql: result.parsed
        });
    }

    static async json2SQL(ctx) {
        logger.info('Converting json to sql');
        ctx.body = ResultSerializer.serialize({
            query: Json2sql.toSQL(ctx.request.body),
            jsonSql: ctx.request.body
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
router.post('/json2SQL', ConvertRouter.json2SQL);

module.exports = router;
