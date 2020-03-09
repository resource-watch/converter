/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./test-server');

const should = chai.should();

const requester = getTestServer();

nock.disableNetConnect();
nock.enableNetConnect(`${process.env.HOST_IP}:${process.env.PORT}`);

describe('GET sql2FS conversion tests - excludeGeometries parameter', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();
    });

    it('Query with no excludeGeometries parameter adds no additional parameter to the generated query (happy case)', async () => {
        const datasetId = 'atlasprotected_areasMapServer4';
        const query = `SELECT Category_EN, PA_Area_ha_KA FROM ${datasetId} LIMIT 20`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: '?outFields=Category_EN,PA_Area_ha_KA&tableName=atlasprotected_areasMapServer4&where=1=1&resultRecordCount=20&supportsPagination=true',
                    fs: {
                        tableName: 'atlasprotected_areasMapServer4',
                        outFields: 'Category_EN,PA_Area_ha_KA',
                        resultRecordCount: 20,
                        supportsPagination: true,
                        where: '1=1'
                    },
                    jsonSql: {
                        select: [{
                            value: 'Category_EN',
                            alias: null,
                            type: 'literal'
                        }, { value: 'PA_Area_ha_KA', alias: null, type: 'literal' }],
                        from: 'atlasprotected_areasMapServer4',
                        limit: 20
                    }
                }
            }
        };

        const response = await requester
            .get(`/api/v1/convert/sql2FS`)
            .query({
                sql: query,
                loggedUser: { id: 'microservice' }

            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Query with excludeGeometries=false parameter adds no additional parameter to the generated query', async () => {
        const datasetId = 'atlasprotected_areasMapServer4';
        const query = `SELECT Category_EN, PA_Area_ha_KA FROM ${datasetId} LIMIT 20`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: '?outFields=Category_EN,PA_Area_ha_KA&tableName=atlasprotected_areasMapServer4&where=1=1&resultRecordCount=20&supportsPagination=true',
                    fs: {
                        tableName: 'atlasprotected_areasMapServer4',
                        outFields: 'Category_EN,PA_Area_ha_KA',
                        resultRecordCount: 20,
                        supportsPagination: true,
                        where: '1=1'
                    },
                    jsonSql: {
                        select: [{
                            value: 'Category_EN',
                            alias: null,
                            type: 'literal'
                        }, { value: 'PA_Area_ha_KA', alias: null, type: 'literal' }],
                        from: 'atlasprotected_areasMapServer4',
                        limit: 20
                    }
                }
            }
        };

        const response = await requester
            .get(`/api/v1/convert/sql2FS`)
            .query({
                sql: query,
                excludeGeometries: false,
                loggedUser: { id: 'microservice' }
            });

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Query with excludeGeometries=true parameter adds the additional returnGeometry=false parameter to the generated query', async () => {
        const datasetId = 'atlasprotected_areasMapServer4';
        const query = `SELECT Category_EN, PA_Area_ha_KA FROM ${datasetId} LIMIT 20`;

        const reply = {
            data: {
                type: 'result',
                attributes: {
                    query: '?outFields=Category_EN,PA_Area_ha_KA&tableName=atlasprotected_areasMapServer4&where=1=1&resultRecordCount=20&supportsPagination=true&returnGeometry=false',
                    fs: {
                        tableName: 'atlasprotected_areasMapServer4',
                        outFields: 'Category_EN,PA_Area_ha_KA',
                        resultRecordCount: 20,
                        supportsPagination: true,
                        where: '1=1',
                        returnGeometry: false
                    },
                    jsonSql: {
                        select: [{
                            value: 'Category_EN',
                            alias: null,
                            type: 'literal'
                        }, { value: 'PA_Area_ha_KA', alias: null, type: 'literal' }],
                        from: 'atlasprotected_areasMapServer4',
                        limit: 20
                    }
                }
            }
        };

        const response = await requester
            .get(`/api/v1/convert/sql2FS`)
            .query({
                sql: query,
                excludeGeometries: true,
                loggedUser: { id: 'microservice' }
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
