/* eslint-disable max-len,no-useless-escape */
const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { mockValidateRequestWithApiKey } = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(`${process.env.HOST_IP}:${process.env.PORT}`);

describe('sql2SQL conversion tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Basic select all query (select * from dataset) conversion should be successful (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const query = `SELECT * FROM ${datasetId}`;

        const reply = {
            data: {
                type: 'result',
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
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Select all query with grouping (select * from dataset group by field) conversion should be successful', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const groupByFieldName = 'foo';
        const query = `SELECT * FROM ${datasetId} GROUP BY ${groupByFieldName}`;

        const reply = {
            data: {
                type: 'result',
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
                                type: 'literal',
                                value: groupByFieldName
                            }
                        ]
                    }
                },
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Select specific fields query (select fieldA, fieldB from dataset) should be successful', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const fieldAName = 'foo';
        const fieldBName = 'bar';
        const query = `select ${fieldAName}, ${fieldBName} from ${datasetId}`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: `SELECT ${fieldAName}, ${fieldBName} FROM ${datasetId}`,
                    jsonSql: {
                        select: [
                            {
                                alias: null,
                                type: 'literal',
                                value: fieldAName
                            },
                            {
                                alias: null,
                                type: 'literal',
                                value: fieldBName
                            }
                        ],
                        from: datasetId
                    }
                },
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Select all query with function (select function(field) from dataset) conversion should be successful', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const fieldName = 'foo';
        const functionName = 'trim';
        const query = `select ${functionName}(${fieldName}) from ${datasetId}`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: `SELECT ${functionName}(${fieldName}) FROM ${datasetId}`,
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
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Select all query with group by function (select * from dataset group by function(field)) should be successful', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const fieldName = 'foo';
        const functionName = 'trim';
        const query = `SELECT ${functionName}(${fieldName}) FROM ${datasetId} GROUP BY ${functionName}(${fieldName})`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: `SELECT ${functionName}(${fieldName}) FROM ${datasetId} GROUP BY ${functionName}(${fieldName})`,
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
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Select all query with group by function with named arguments (select * from dataset group by function(\'name\'="field")) should be successful', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const fieldName = 'foo';
        const functionName = 'trim';
        const query = `SELECT ${functionName}(${fieldName}) FROM ${datasetId} GROUP BY ${functionName}('name'="${fieldName}")`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: `SELECT ${functionName}(${fieldName}) FROM ${datasetId} GROUP BY ${functionName}('name'="${fieldName}")`,
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
                                        name: 'name',
                                        type: 'literal'
                                    }
                                ]
                            }
                        ]

                    }
                },
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Select all query with group by function with mixed named and unamed arguments (select count(*) from d88c8f23-36d0-47be-83f4-8574db2ee0a6 group by date_range(field=\'createdAt\',\'format\'=\'yyyy-MM-dd\' ,\'2014-08-18\',\'2014-08-17\',\'now-8d\',\'now-7d\',\'now-6d\',\'now\')) should be successful', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const fieldName = 'foo';
        const functionName = 'trim';
        const query = `SELECT ${functionName}(${fieldName}) FROM ${datasetId} GROUP BY ${functionName}('name'="${fieldName}",'format'='yyyy-MM-dd' ,'2014-08-18','2014-08-17','now-8d','now-7d','now-6d','now')`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: `SELECT ${functionName}(${fieldName}) FROM ${datasetId} GROUP BY ${functionName}('name'="${fieldName}", 'format'='yyyy-MM-dd','2014-08-18','2014-08-17','now-8d','now-7d','now-6d','now')`,
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
                                        name: 'name',
                                        type: 'literal'
                                    },
                                    {
                                        name: 'format',
                                        type: 'string',
                                        value: 'yyyy-MM-dd'
                                    },
                                    {
                                        type: 'string',
                                        value: '2014-08-18'
                                    },
                                    {
                                        type: 'string',
                                        value: '2014-08-17'
                                    },
                                    {
                                        type: 'string',
                                        value: 'now-8d'
                                    },
                                    {
                                        type: 'string',
                                        value: 'now-7d'
                                    },
                                    {
                                        type: 'string',
                                        value: 'now-6d'
                                    },
                                    {
                                        type: 'string',
                                        value: 'now'
                                    }
                                ]
                            }
                        ]

                    }
                },
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Select \'DISTINCT\' query with \'WHERE\', \'GROUP BY\' and \'ORDER BY\' should be successful', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const fieldName = 'foo';
        const query = `SELECT DISTINCT ${fieldName} FROM ${datasetId} WHERE ${fieldName} IS NOT NULL GROUP BY ${fieldName} ORDER BY ${fieldName}`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: `SELECT DISTINCT ${fieldName} FROM ${datasetId} WHERE ${fieldName} IS NOT NULL GROUP BY ${fieldName} ORDER BY ${fieldName}`,
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
                        where: [{
                            left: [{
                                type: 'literal',
                                value: 'foo'
                            }],
                            right: [{
                                type: 'literal',
                                value: 'NULL'
                            }],
                            type: 'operator',
                            value: 'IS NOT'
                        }]
                    }
                },
            }
        };

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Query with geostore param should be successful', async () => {
        mockValidateRequestWithApiKey({});
        const datasetId = '051364f0-fe44-46c2-bf95-fa4b93e2dbd2';
        const query = `SELECT * FROM ${datasetId}`;
        const geostore = '89cb48bcd6888a2d4c95df12babff9cc';

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: `${query} WHERE ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{\"type\":\"Polygon\",\"coordinates\":[]}'), 4326), the_geom)`,
                    jsonSql: {
                        select: [
                            {
                                value: '*',
                                alias: null,
                                type: 'wildcard'
                            }
                        ],
                        where: {
                            arguments: [
                                {
                                    arguments: [
                                        {
                                            arguments: [
                                                {
                                                    type: 'string',
                                                    value: '{"type":"Polygon","coordinates":[]}'
                                                }
                                            ],
                                            type: 'function',
                                            value: 'ST_GeomFromGeoJSON'
                                        },
                                        {
                                            type: 'number',
                                            value: 4326
                                        }
                                    ],
                                    type: 'function',
                                    value: 'ST_SetSRID'
                                },
                                {
                                    type: 'literal',
                                    value: 'the_geom'
                                }
                            ],
                            type: 'function',
                            value: 'ST_INTERSECTS'
                        },
                        from: datasetId
                    }
                }
            }
        };

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/geostore/${geostore}`)
            .reply(200, {
                data: {
                    type: 'geoStore',
                    id: geostore,
                    attributes: {
                        geojson: {
                            features: [{
                                properties: null,
                                type: 'Feature',
                                geometry: { type: 'Polygon', coordinates: [] }
                            }],
                            crs: {},
                            type: 'FeatureCollection'
                        },
                        hash: geostore,
                        provider: {},
                        areaHa: 0,
                        bbox: [null, null, null, null],
                        lock: false,
                        info: { use: {} }
                    }
                }
            });

        const response = await requester
            .post(`/api/v1/convert/sql2SQL`)
            .set('x-api-key', 'api-key-test')
            .send({
                sql: query,
                geostore
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
