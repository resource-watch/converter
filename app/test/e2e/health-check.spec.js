const nock = require('nock');
const { getTestServer } = require('./test-server');

let requester;

describe('GET healthcheck', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Checking the application\'s health should return a 200', async () => {
        const response = await requester
            .get('/healthcheck');

        response.status.should.equal(200);
        response.body.should.be.an('object').and.have.property('uptime');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            const pendingMocks = nock.pendingMocks();
            if (pendingMocks.length > 1) {
                throw new Error(`Not all nock interceptors were used: ${pendingMocks}`);
            }
        }
    });
});
