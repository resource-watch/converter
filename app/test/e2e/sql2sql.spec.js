/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const config = require('config');
const chai = require('chai');
const { getTestServer } = require('./test-server');

const should = chai.should();

const requester = getTestServer();

nock.disableNetConnect();
nock.enableNetConnect(`${process.env.HOST_IP}:${process.env.PORT}`);

describe('sql2SQL conversion tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();
    });

    it('Basic select all query (select * from dataset) conversion should be successful (happy case)', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2'.toUpperCase();
        const query = `select * from ${datasetId}`.toUpperCase();

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query,
                    jsonSql: {
                        select: [
                            {
                                value: '*',
                                alias: null,
                                type: 'wildcard'
                            }
                        ],
                        from: datasetId
                    }
                },
                relationships: {}
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply)
    });

    it('Basic select all query with grouping (select * from dataset group by field) conversion should be successful (happy case)', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2'.toUpperCase();
        const groupByFieldName = 'foo'.toUpperCase();
        const query = `select * from ${datasetId} group by ${groupByFieldName}`.toUpperCase();

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query,
                    jsonSql: {
                        select: [
                            {
                                value: '*',
                                alias: null,
                                type: 'wildcard'
                            }
                        ],
                        from: datasetId,
                        group: [
                            {
                                type: "literal",
                                value: groupByFieldName
                            }
                        ]
                    }
                },
                relationships: {}
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply)
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
