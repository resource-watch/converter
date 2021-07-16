const chai = require('chai');
const chaiHttp = require('chai-http');

let requester;

chai.use(chaiHttp);

exports.getTestServer = function getTestServer() {
    if (requester) {
        return requester;
    }

    const server = require('../../src/app');
    requester = chai.request(server).keepOpen();

    return requester;
};
