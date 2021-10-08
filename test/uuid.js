const assert = require('assert');
const uuid = require('../lib/uuid');
const { describe } = require('mocha');
const reg = /^(\{){0,1}[0-9a-fA-F]{8}[0-9a-fA-F]{4}[0-9a-fA-F]{4}[0-9a-fA-F]{4}[0-9a-fA-F]{12}(\}){0,1}$/;

describe('uuid', function () {
    it('test uuid example', function () {
        const uid = uuid();
        assert.equal(reg.test(uid), true);
    });
});
