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

app.use(koaSimpleHealthCheck());
app.use(koaLogger());

app.use(bodyParser({
    jsonLimit: '50mb'
}));

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
    logger,
    gatewayURL: process.env.GATEWAY_URL,
    microserviceToken: process.env.MICROSERVICE_TOKEN,
    fastlyEnabled: process.env.FASTLY_ENABLED,
    fastlyServiceId: process.env.FASTLY_SERVICEID,
    fastlyAPIKey: process.env.FASTLY_APIKEY,
    requireAPIKey: process.env.REQUIRE_API_KEY || true,
    awsCloudWatchLoggingEnabled: process.env.AWS_CLOUDWATCH_LOGGING_ENABLED || true,
    awsRegion: process.env.AWS_REGION,
    awsCloudWatchLogStreamName: config.get('service.name'),
}));


loader.loadRoutes(app);

// get port of environment, if not exist obtain of the config.
// In production environment, the port must be declared in environment variable
const port = config.get('service.port');

const server = app.listen(port);

logger.info(`Server started in port:${port}`);

module.exports = server;
