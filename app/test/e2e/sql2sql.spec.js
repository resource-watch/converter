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

    it('Select all query with grouping (select * from dataset group by field) conversion should be successful', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2'.toUpperCase();
        const groupByFieldName = 'foo'.toUpperCase();
        const query = `select * from ${datasetId} group by "${groupByFieldName}"`.toUpperCase();

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

    it('Select specific fields query (select fieldA, fieldB from dataset) should be successful', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2'.toUpperCase();
        const fieldAName = 'foo'.toUpperCase();
        const fieldBName = 'bar'.toUpperCase();
        const query = `select ${fieldAName}, ${fieldBName} from ${datasetId}`;

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `SELECT "${fieldAName}", "${fieldBName}" FROM ${datasetId}`,
                    jsonSql: {
                        select: [
                            {
                                alias: null,
                                type: "literal",
                                value: fieldAName
                            },
                            {
                                alias: null,
                                type: "literal",
                                value: fieldBName
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

    it('Select all query with function (select function(field) from dataset) conversion should be successful', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2'.toUpperCase();
        const fieldName = 'foo'.toUpperCase();
        const functionName = 'trim'.toUpperCase();
        const query = `select ${functionName}(${fieldName}) from ${datasetId}`.toUpperCase();

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `SELECT ${functionName}("${fieldName}") FROM ${datasetId}`,
                    jsonSql: {
                        select: [
                            {
                                alias: null,
                                value: functionName,
                                type: 'function',
                                arguments: [
                                    {
                                        value: fieldName,
                                        type: 'literal'
                                    }
                                ]
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
        response.body.should.deep.equal(reply);
    });

    it('Select all query with group by function (select * from dataset group by function(field)) should be successful', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2'.toUpperCase();
        const fieldName = 'foo'.toUpperCase();
        const functionName = 'trim'.toUpperCase();
        const query = `SELECT ${functionName}(${fieldName}) FROM ${datasetId} GROUP BY ${functionName}(${fieldName})`.toUpperCase();

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `SELECT ${functionName}("${fieldName}") FROM ${datasetId} GROUP BY ${functionName}("${fieldName}")`,
                    jsonSql: {
                        select: [
                            {
                                alias: null,
                                value: functionName,
                                type: 'function',
                                arguments: [
                                    {
                                        value: fieldName,
                                        type: 'literal'
                                    }
                                ]
                            }
                        ],
                        from: datasetId,
                        group: [
                            {
                                alias: null,
                                value: functionName,
                                type: 'function',
                                arguments: [
                                    {
                                        value: fieldName,
                                        type: 'literal'
                                    }
                                ]
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
        response.body.should.deep.equal(reply);
    });

    it('Select all query with group by function with named arguments (select * from dataset group by function(\'name\'="field")) should be successful', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2'.toUpperCase();
        const fieldName = 'foo'.toUpperCase();
        const functionName = 'trim'.toUpperCase();
        const query = `SELECT ${functionName}(${fieldName}) FROM ${datasetId} GROUP BY ${functionName}('name'="${fieldName}")`.toUpperCase();

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `SELECT ${functionName}("${fieldName}") FROM ${datasetId} GROUP BY ${functionName}( 'NAME'="${fieldName}")`,
                    jsonSql: {
                        select: [
                            {
                                alias: null,
                                value: functionName,
                                type: 'function',
                                arguments: [
                                    {
                                        value: fieldName,
                                        type: 'literal'
                                    }
                                ]
                            }
                        ],
                        from: datasetId,
                        group: [
                            {
                                alias: null,
                                value: functionName,
                                type: 'function',
                                arguments: [
                                    {
                                        value: fieldName,
                                        name: 'NAME',
                                        type: 'literal'
                                    }
                                ]
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
        response.body.should.deep.equal(reply);
    });

    it('Select \'DISTINCT\' query with \'WHERE\', \'GROUP BY\' and \'ORDER BY\' should be successful', async () => {
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2'.toUpperCase();
        const fieldName = 'foo'.toUpperCase();
        const query = `SELECT DISTINCT ${fieldName} FROM ${datasetId} WHERE ${fieldName} IS NOT NULL GROUP BY ${fieldName} ORDER BY ${fieldName}`.toUpperCase();

        const reply = {
            data: {
                type: 'result',
                id: 'undefined',
                attributes: {
                    query: `SELECT DISTINCT "${fieldName}" FROM ${datasetId} WHERE ${fieldName} IS NOT NULL GROUP BY "${fieldName}" ORDER BY "${fieldName}"`,
                    jsonSql: {
                        select: [
                            {
                                type: 'distinct',
                                arguments: [
                                    {
                                        alias: null,
                                        value: fieldName,
                                        type: 'literal'
                                    }
                                ]
                            }
                        ],
                        from: datasetId,
                        group: [
                            {
                                value: fieldName,
                                type: 'literal'
                            }
                        ],
                        orderBy: [
                            {
                                alias: null,
                                direction: null,
                                value: fieldName,
                                type: 'literal'
                            }
                        ],
                        where: {
                            left: {
                                type: "literal",
                                value: "FOO"
                            },
                            right: {
                                type: "literal",
                                value: "NULL"
                            },
                            type: "operator",
                            value: "IS NOT"
                        }
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
        response.body.should.deep.equal(reply);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
