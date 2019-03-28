/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./test-server');

const should = chai.should();

const requester = getTestServer();

nock.disableNetConnect();
nock.enableNetConnect(`${process.env.HOST_IP}:${process.env.PORT}`);

describe('sql2FS conversion tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();
    });

    it('Order by field with no asc|desc should should up with just the order column name on generated request', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const query = `SELECT * FROM ${datasetId} ORDER BY y`;

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `?outFields=*&tableName=${datasetId}&where=1=1&orderByFields=y`,
                    fs: {
                        tableName: datasetId,
                        outFields: '*',
                        orderByFields: 'y',
                        where: '1=1'
                    },
                    jsonSql: {
                        select: [
                            {
                                value: '*',
                                alias: null,
                                type: 'wildcard'
                            }
                        ],
                        from: datasetId,
                        orderBy: [
                            {
                                type: 'literal',
                                value: 'y',
                                alias: null,
                                direction: null
                            }
                        ]
                    }
                },
                relationships: {}
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2FS`)
            .send({
                sql: query,
                loggedUser: {id : 'microservice'}

            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply)
    });

    it('Order by field and DESC should be reflected on generated request (happy case)', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const query = `SELECT * FROM ${datasetId} ORDER BY y desc`;

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `?outFields=*&tableName=${datasetId}&where=1=1&orderByFields=y desc`,
                    fs: {
                        tableName: datasetId,
                        outFields: '*',
                        orderByFields: 'y desc',
                        where: '1=1'
                    },
                    jsonSql: {
                        select: [
                            {
                                value: '*',
                                alias: null,
                                type: 'wildcard'
                            }
                        ],
                        from: datasetId,
                        orderBy: [
                            {
                                type: 'literal',
                                value: 'y',
                                alias: null,
                                direction: 'desc'
                            }
                        ]
                    }
                },
                relationships: {}
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2FS`)
            .send({
                sql: query,
                loggedUser: {id : 'microservice'}

            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply)
    });

    it('Order by field and ASC should be reflected on generated request (happy case)', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const query = `SELECT * FROM ${datasetId} ORDER BY y asc`;

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `?outFields=*&tableName=${datasetId}&where=1=1&orderByFields=y asc`,
                    fs: {
                        tableName: datasetId,
                        outFields: '*',
                        orderByFields: 'y asc',
                        where: '1=1'
                    },
                    jsonSql: {
                        select: [
                            {
                                value: '*',
                                alias: null,
                                type: 'wildcard'
                            }
                        ],
                        from: datasetId,
                        orderBy: [
                            {
                                type: 'literal',
                                value: 'y',
                                alias: null,
                                direction: 'asc'
                            }
                        ]
                    }
                },
                relationships: {}
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2FS`)
            .send({
                sql: query,
                loggedUser: {id : 'microservice'}

            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply)
    });



    it('Order by multiple fields with ASC|DESC|none should be reflected on generated request (happy case)', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const query = `SELECT * FROM ${datasetId} ORDER BY x, y asc, z desc`;

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `?outFields=*&tableName=${datasetId}&where=1=1&orderByFields=x,y asc,z desc`,
                    fs: {
                        tableName: datasetId,
                        outFields: '*',
                        orderByFields: 'x,y asc,z desc',
                        where: '1=1'
                    },
                    jsonSql: {
                        select: [
                            {
                                value: '*',
                                alias: null,
                                type: 'wildcard'
                            }
                        ],
                        from: datasetId,
                        orderBy: [
                            {
                                type: 'literal',
                                value: 'x',
                                alias: null,
                                direction: null
                            },
                            {
                                type: 'literal',
                                value: 'y',
                                alias: null,
                                direction: 'asc'
                            },
                            {
                                type: 'literal',
                                value: 'z',
                                alias: null,
                                direction: 'desc'
                            }
                        ]
                    }
                },
                relationships: {}
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2FS`)
            .send({
                sql: query,
                loggedUser: {id : 'microservice'}

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
