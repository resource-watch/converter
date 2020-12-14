const logger = require('logger');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const config = require('config');
const koaLogger = require('koa-logger');
const loader = require('loader');
const ErrorSerializer = require('serializers/errorSerializer');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const koaSimpleHealthCheck = require('koa-simple-healthcheck');

const app = new Koa();

// if environment is dev then load koa-logger
if (process.env.NODE_ENV === 'dev') {
    app.use(koaLogger());
}

app.use(bodyParser({
    jsonLimit: '50mb'
}));
app.use(koaSimpleHealthCheck());

// catch errors and send in jsonapi standard. Always return vnd.api+json
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        ctx.status = err.status || 500;

        if (ctx.status >= 500) {
            logger.error(err);
        } else {
            logger.info(err);
        }
        ctx.body = ErrorSerializer.serializeError(ctx.status, err.message);
        if (process.env.NODE_ENV === 'prod' && ctx.status === 500) {
            ctx.body = 'Unexpected error';
        }
    }
    ctx.response.type = 'application/vnd.api+json';
});

app.use(RWAPIMicroservice.bootstrap({
    name: config.get('service.name'),
    info: require('../microservice/register.json'),
    swagger: require('../microservice/public-swagger.json'),
    logger,
    baseURL: process.env.CT_URL,
    url: process.env.LOCAL_URL,
    token: process.env.CT_TOKEN,
}));


loader.loadRoutes(app);

// get port of environment, if not exist obtain of the config.
// In production environment, the port must be declared in environment variable
const port = process.env.PORT || config.get('service.port');

const server = app.listen(port, () => {
    if (process.env.CT_REGISTER_MODE === 'auto') {
        RWAPIMicroservice.register().then(() => {
            logger.info('CT registration process started');
        }, (error) => {
            logger.error(error);
            process.exit(1);
        });
    }
});

logger.info(`Server started in port:${port}`);

module.exports = server;
