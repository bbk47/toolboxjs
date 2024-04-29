const assert = require('assert');
const deferred = require('../lib/deferred');
const { describe } = require('mocha');

describe('deferred', function () {
    it('test deferred resolve', function () {
        var defer = deferred();
        setTimeout(() => {
            defer.resolve("okok")
        }, 10);
        return defer.promise.then(ret => {
            assert.equal(ret, "okok");
        });
    });
    it('test deferred reject', function () {
        var defer = deferred();
        setTimeout(() => {
            defer.reject("err111");
        }, 10);
        return defer.promise.catch(err => {
            assert.equal(err, "err111")
        });
    });
});
