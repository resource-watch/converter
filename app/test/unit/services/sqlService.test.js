// 'use strict';
// var logger = require('logger');
// var should = require('should');
// var assert = require('assert');
// var SQLService = require('services/sqlService');
//
// describe('SQLService', function() {
//
//     before(function*() {
//
//     });
//
//     it('SQL correct', function *(){
//         let sql = 'SELECT * FROM table';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(false);
//     });
//
//     it('SQL with join', function *(){
//         let sql = 'SELECT * FROM table, table2';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(true);
//         result.message.should.not.be.equal(null);
//     });
//
//     it('SQL with INSERT', function *(){
//         let sql = 'INSERT INTO TEST VALUES (2)';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(true);
//         result.message.should.not.be.equal(null);
//     });
//
//     it('SQL malformed', function *(){
//         let sql = 'INSERT INTO * where';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(true);
//         result.message.should.not.be.equal(null);
//     });
//
//     it('SQL with where', function *(){
//         let sql = 'SELECT * FROM TABLA WHERE A=2';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(false);
//         result.should.not.have.property('messages');
//     });
//
//     it('SQL with order', function *(){
//         let sql = 'SELECT * FROM TABLA ORDER BY A';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(false);
//         result.should.not.have.property('messages');
//     });
//
//     it('SQL with limit ', function *(){
//         let sql = 'SELECT * FROM TABLA LIMIT 2';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(false);
//         result.should.not.have.property('messages');
//     });
//
//     it('SQL with group by ', function *(){
//         let sql = 'SELECT * FROM TABLA  group by a';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(false);
//         result.should.not.have.property('messages');
//     });
//
//     it('SQL with 2 queries ', function *(){
//         let sql = 'SELECT * FROM TABLA  group by a;DELETE FROM TABLA';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(true);
//         result.message.should.not.be.equal(null);
//     });
//
//
//     it('SQL malformed query', function *(){
//         let sql = 'SELECT (SELECT * FROM TABLA 2) P, p* FROM TABLA  group by a';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(true);
//         result.message.should.not.be.equal(null);
//     });
//     it('SQL with inner', function *(){
//         let sql = 'SELECT tabla.a, tabla.b,tabla.c from tabla left join tabla2 on tabla.a = tabla2.b';
//         let result = SQLService.checkSQL(sql);
//         result.error.should.be.equal(true);
//         result.message.should.not.be.equal(null);
//     });
//
//
//     after(function*() {
//
//     });
// });
