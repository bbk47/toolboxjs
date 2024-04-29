const assert = require('assert');
const merge = require('../lib/merge');
const { describe } = require('mocha');

describe('socks5', function () {
    it('test object merge', function () {
        var obj = merge({ sss: 1 }, { sss: 123 }, { bb: 456 }, { sss: null });
        assert.equal(obj.sss, 123);
        assert.equal(obj.bb, 456);
    });
});
