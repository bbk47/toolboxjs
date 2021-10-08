const assert = require('assert');
const md5 = require('../lib/md5');
const { describe } = require('mocha');

describe('md5', function () {
    it('test md5 example', function () {
        assert.equal(md5('admin'), '21232f297a57a5a743894a0e4a801fc3');
    });
});
