'use strict';
var logger = require('logger');
var should = require('should');
var assert = require('assert');
var ConverterService = require('services/converterService');

describe('SQLService', function() {

    before(function*() {

    });

    it('Feature Service correct (only select)', function*() {
        let resultSQL = 'SELECT * FROM table';
        let fs = {
            outFields: '*'
        };
        let tableName = 'table';
        let result = ConverterService.fs2SQL(fs, tableName);
        result.sql.should.be.equal(resultSQL);
    });


    it('Feature Service correct (select with columns)', function*() {
        let resultSQL = 'SELECT COL1, COL2 AS COL FROM table';
        let fs = {
            outFields: 'COL1, COL2 AS COL'
        };
        let tableName = 'table';
        let result = ConverterService.fs2SQL(fs, tableName);
        result.sql.should.be.equal(resultSQL);
    });


    it('Feature Service correct (select with where)', function*() {
        let resultSQL = 'SELECT COL1, COL2 AS COL FROM table WHERE COL1 = \'juan\' and COL2=2';
        let fs = {
            outFields: 'COL1, COL2 AS COL',
            where: 'COL1 = \'juan\' and COL2=2'
        };
        let tableName = 'table';
        let result = ConverterService.fs2SQL(fs, tableName);
        result.sql.should.be.equal(resultSQL);
    });


    it('Feature Service correct (select with group by)', function*() {
        let resultSQL = 'SELECT COL1, COL2 AS COL, count(FIELD) AS OUTFIELD FROM table WHERE COL1 = \'juan\' and COL2=2 GROUP BY COL2';

        let outStatistics = [{
            'statisticType': 'count',
            'onStatisticField': 'FIELD',
            'outStatisticFieldName': 'OUTFIELD'
        }];
        let fs = {
            outFields: 'COL1, COL2 AS COL',
            where: 'COL1 = \'juan\' and COL2=2',
            outStatistics: JSON.stringify(outStatistics),
            groupByFieldsForStatistics: 'COL2'
        };
        let tableName = 'table';
        let result = ConverterService.fs2SQL(fs, tableName);
        result.sql.should.be.equal(resultSQL);
    });

    it('Feature Service correct (select with limit)', function*() {
        let resultSQL = 'SELECT COL1, COL2 AS COL, count(FIELD) AS OUTFIELD FROM table WHERE COL1 = \'juan\' and COL2=2 GROUP BY COL2 LIMIT 10';

        let outStatistics = [{
            'statisticType': 'count',
            'onStatisticField': 'FIELD',
            'outStatisticFieldName': 'OUTFIELD'
        }];
        let fs = {
            outFields: 'COL1, COL2 AS COL',
            where: 'COL1 = \'juan\' and COL2=2',
            outStatistics: JSON.stringify(outStatistics),
            groupByFieldsForStatistics: 'COL2',
            resultRecordCount: 10
        };
        let tableName = 'table';
        let result = ConverterService.fs2SQL(fs, tableName);
        result.sql.should.be.equal(resultSQL);
    });

    it('Feature Service correct (select with order)', function*() {
        let resultSQL = 'SELECT COL1, COL2 AS COL, count(FIELD) AS OUTFIELD FROM table WHERE COL1 = \'juan\' and COL2=2 GROUP BY COL2 ORDER BY COL1 ASC,COL2 DESC LIMIT 10';

        let outStatistics = [{
            'statisticType': 'count',
            'onStatisticField': 'FIELD',
            'outStatisticFieldName': 'OUTFIELD'
        }];
        let fs = {
            outFields: 'COL1, COL2 AS COL',
            where: 'COL1 = \'juan\' and COL2=2',
            outStatistics: JSON.stringify(outStatistics),
            groupByFieldsForStatistics: 'COL2',
            resultRecordCount: 10,
            orderByFields: 'COL1 ASC,COL2 DESC'
        };
        let tableName = 'table';
        let result = ConverterService.fs2SQL(fs, tableName);
        result.sql.should.be.equal(resultSQL);
    });

    it('Feature Service correct (select with geometry intersec)', function*() {
        let resultSQL = 'SELECT * FROM table WHERE ST_INTERSECTS(the_geom, ST_AsGeoJSON(\'{\"type\":\"polygon\",\"features\":[{\"type\":\"feature\",\"properties\":{},\"geometry\":{\"type\":\"polygon\",\"coordinates\":[[[88.9453125,57.89149735271031],[88.9453125,58.63121664342478],[91.40625,58.63121664342478],[91.40625,57.89149735271031],[88.9453125,57.89149735271031]]]}}]}\'))';
        let fs = {
            geometry: '{\"type\":\"polygon\",\"features\":[{\"type\":\"feature\",\"properties\":{},\"geometry\":{\"type\":\"polygon\",\"coordinates\":[[[88.9453125,57.89149735271031],[88.9453125,58.63121664342478],[91.40625,58.63121664342478],[91.40625,57.89149735271031],[88.9453125,57.89149735271031]]]}}]}'
        };
        let tableName = 'table';
        let result = ConverterService.fs2SQL(fs, tableName);
        result.sql.should.be.equal(resultSQL);
    });



    it('SQL to Feature Service', function*() {
        let sql = 'SELECT * FROM table';
        let resultFs = {
            outFields: '*',
            tableName: 'table'
        };
        let tableName = 'table';
        let result = ConverterService.sql2FS(sql);
        result.should.not.be.null();
        result.should.have.property('fs');
        result.fs.should.have.property('outFields',resultFs.outFields);
        result.fs.should.have.property('tableName',resultFs.tableName);
    });


    it('SQL to Feature Service', function*() {
        let sql = 'SELECT COL1, COL2 AS COL FROM table';
        let resultFs = {
            outFields: 'COL1,COL2 AS COL',
            tableName: 'table'
        };
        let result = ConverterService.sql2FS(sql);
        result.should.not.be.null();
        result.should.have.property('fs');
        result.fs.should.have.property('outFields',resultFs.outFields);
        result.fs.should.have.property('tableName',resultFs.tableName);
    });

    it('SQL to Feature Servicee correct (select with where)', function*() {
        let sql = 'SELECT COL1, COL2 AS COL FROM table WHERE COL1 = \'juan\' and COL2=2';
        let resultFs = {
            outFields: 'COL1,COL2 AS COL',
            where: 'COL1 = \'juan\' and COL2=2',
            tableName: 'table'
        };
        let result = ConverterService.sql2FS(sql);
        result.should.not.be.null();
        result.should.have.property('fs');
        result.fs.should.have.property('outFields',resultFs.outFields);
        result.fs.should.have.property('tableName',resultFs.tableName);
        result.fs.should.have.property('where',resultFs.where);
    });

    it('SQL to Feature Servicee correct (select with group by)', function*() {
        let sql = 'SELECT COL1, COL2 AS COL, count(FIELD) AS OUTFIELD, avg(COL2) as another FROM table WHERE COL1 = \'juan\' and COL2=2 GROUP BY COL2';

        let outStatistics = [{
            'statisticType': 'count',
            'onStatisticField': 'FIELD',
            'outStatisticFieldName': 'OUTFIELD'
        },{
            'statisticType': 'avg',
            'onStatisticField': 'COL2',
            'outStatisticFieldName': 'another'
        }];
        let resultFs = {
            outFields: 'COL1,COL2 AS COL',
            where: 'COL1 = \'juan\' and COL2=2',
            outStatistics: outStatistics,
            groupByFieldsForStatistics: 'COL2',
            tableName: 'table'
        };
        let result = ConverterService.sql2FS(sql);
        result.should.not.be.null();
        result.should.have.property('fs');
        result.fs.should.have.property('outFields',resultFs.outFields);
        result.fs.should.have.property('tableName',resultFs.tableName);
        result.fs.should.have.property('where',resultFs.where);
        result.fs.should.have.property('groupByFieldsForStatistics',resultFs.groupByFieldsForStatistics);
        result.fs.should.have.property('outStatistics');
        let outStatisticsResult = JSON.parse(result.fs.outStatistics);
        outStatistics.should.length(2);
        outStatisticsResult[0].should.have.property('statisticType',resultFs.outStatistics[0].statisticType);
        outStatisticsResult[0].should.have.property('outStatisticFieldName',resultFs.outStatistics[0].outStatisticFieldName);
        outStatisticsResult[0].should.have.property('onStatisticField',resultFs.outStatistics[0].onStatisticField);
    });

    it('SQL to Feature Servicee correct (select with limit)', function*() {
        let sql = 'SELECT COL1, COL2 AS COL, count(FIELD) AS OUTFIELD FROM table WHERE COL1 = \'juan\' and COL2=2 GROUP BY COL2 LIMIT 10';

        let outStatistics = [{
            'statisticType': 'count',
            'onStatisticField': 'FIELD',
            'outStatisticFieldName': 'OUTFIELD'
        }];
        let resultFs = {
            outFields: 'COL1,COL2 AS COL',
            where: 'COL1 = \'juan\' and COL2=2',
            outStatistics: outStatistics,
            groupByFieldsForStatistics: 'COL2',
            resultRecordCount: 10,
            supportsPagination: true,
            tableName: 'table'
        };
        let result = ConverterService.sql2FS(sql);
        result.should.not.be.null();
        result.should.have.property('fs');
        result.fs.should.have.property('outFields',resultFs.outFields);
        result.fs.should.have.property('tableName',resultFs.tableName);
        result.fs.should.have.property('where',resultFs.where);
        result.fs.should.have.property('groupByFieldsForStatistics',resultFs.groupByFieldsForStatistics);
        result.fs.should.have.property('outStatistics');
        let outStatisticsResult = JSON.parse(result.fs.outStatistics);
        outStatistics.should.length(1);
        outStatisticsResult[0].should.have.property('statisticType',resultFs.outStatistics[0].statisticType);
        outStatisticsResult[0].should.have.property('outStatisticFieldName',resultFs.outStatistics[0].outStatisticFieldName);
        outStatisticsResult[0].should.have.property('onStatisticField',resultFs.outStatistics[0].onStatisticField);
        result.fs.should.have.property('resultRecordCount',resultFs.resultRecordCount);
        result.fs.should.have.property('supportsPagination',resultFs.supportsPagination);
    });


    it('SQL to Feature Servicee correct (select with order)', function*() {
        let sql = 'SELECT COL1, COL2 AS COL, count(FIELD) AS OUTFIELD FROM table WHERE COL1 = \'juan\' and COL2=2 GROUP BY COL2 ORDER BY COL1 ASC,COL2 DESC LIMIT 10';

        let outStatistics = [{
            'statisticType': 'count',
            'onStatisticField': 'FIELD',
            'outStatisticFieldName': 'OUTFIELD'
        }];
        let resultFs = {
            outFields: 'COL1,COL2 AS COL',
            where: 'COL1 = \'juan\' and COL2=2',
            outStatistics: outStatistics,
            groupByFieldsForStatistics: 'COL2',
            resultRecordCount: 10,
            supportsPagination: true,
            orderByFields: 'COL1 ASC,COL2 DESC',
            tableName: 'table'
        };
        let result = ConverterService.sql2FS(sql);
        result.should.not.be.null();
        result.should.have.property('fs');
        result.fs.should.have.property('outFields',resultFs.outFields);
        result.fs.should.have.property('tableName',resultFs.tableName);
        result.fs.should.have.property('where',resultFs.where);
        result.fs.should.have.property('groupByFieldsForStatistics',resultFs.groupByFieldsForStatistics);
        result.fs.should.have.property('outStatistics');
        let outStatisticsResult = JSON.parse(result.fs.outStatistics);
        outStatistics.should.length(1);
        outStatisticsResult[0].should.have.property('statisticType',resultFs.outStatistics[0].statisticType);
        outStatisticsResult[0].should.have.property('outStatisticFieldName',resultFs.outStatistics[0].outStatisticFieldName);
        outStatisticsResult[0].should.have.property('onStatisticField',resultFs.outStatistics[0].onStatisticField);
        result.fs.should.have.property('resultRecordCount',resultFs.resultRecordCount);
        result.fs.should.have.property('supportsPagination',resultFs.supportsPagination);
        result.fs.should.have.property('orderByFields',resultFs.orderByFields);
    });

    it('SQL to Feature Servicee incorrect', function*() {
        let sql = 'INSERT COL1, COL2 AS COL, count(FIELD) AS OUTFIELD FROM table WHERE COL1 = \'juan\' and COL2=2 GROUP BY COL2 ORDER BY COL1 ASC,COL2 DESC LIMIT 10';


        let result = ConverterService.sql2FS(sql);
        result.should.not.be.null();
        result.should.have.property('error', true);
        result.should.have.property('message');

    });

    it('SQL to Feature Service correct (select with geometry intersec)', function*() {
        let sql = 'SELECT * FROM table WHERE ST_INTERSECTS(the_geom, ST_AsGeoJSON(\'{\"type\":\"polygon\",\"features\":[{\"type\":\"feature\",\"properties\":{},\"geometry\":{\"type\":\"polygon\",\"coordinates\":[[[88.9453125,57.89149735271031],[88.9453125,58.63121664342478],[91.40625,58.63121664342478],[91.40625,57.89149735271031],[88.9453125,57.89149735271031]]]}}]}\'))';
        let fs = {

        };

        let resultFs = {
            outFields: '*',
            tableName: 'table',
            geometry: '{\"type\":\"polygon\",\"features\":[{\"type\":\"feature\",\"properties\":{},\"geometry\":{\"type\":\"polygon\",\"coordinates\":[[[88.9453125,57.89149735271031],[88.9453125,58.63121664342478],[91.40625,58.63121664342478],[91.40625,57.89149735271031],[88.9453125,57.89149735271031]]]}}]}'            ,
            geometryType: 'esriGeometryPolygon',
            spatialRel: 'esriSpatialRelIntersects',
            inSR: '{\"wkid\":4326}'
        };

        let result = ConverterService.sql2FS(sql);
        result.should.not.be.null();
        result.should.have.property('fs');
        result.fs.should.have.property('outFields',resultFs.outFields);
        result.fs.should.have.property('tableName',resultFs.tableName);
        result.fs.should.not.have.property('where');
        result.fs.should.have.property('geometry',resultFs.geometry);
        result.fs.should.have.property('geometryType',resultFs.geometryType);
        result.fs.should.have.property('spatialRel',resultFs.spatialRel);
        result.fs.should.have.property('inSR',resultFs.inSR);
    });

    after(function*() {

    });
});
