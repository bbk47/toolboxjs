const assert = require('assert');
const retry = require('../lib/retry');
const { describe } = require('mocha');

describe('retry', function () {
    it('test retry max count', function () {
        const awaitErrorTask = () => {
            return new Promise((s, reject) => reject('xxxxxx'));
        }
        return retry(awaitErrorTask).then(() => {
            throw Error("unexcept exec");
        }).catch(err => {
            assert.equal("expect retryCount 5 is attached!", err.message);
        });

    });

    it('test retry custom max count', function () {
        let maxcount = 10;
        const taskfn = () => {
            return new Promise((s, reject) => reject('err'));
        }
        return retry(taskfn, { times: maxcount }).then(() => {
            throw Error("unexcept exec");
        }).catch(err => {
            assert.equal("expect retryCount 10 is attached!", err.message);
        });
    });

    it('test retry errorcall', function () {
        let maxcount = 10;
        let start = 0;
        const taskfn = () => {
            start++;
            return new Promise((s, reject) => reject(Error('retryerr:' + start)));
        }
        return retry(taskfn, { times: maxcount }, function (err) {
            assert.equal("retryerr:" + start, err.message);
        }).then(() => {
            throw Error("unexcept exec");
        }).catch(err => {
            assert.equal("expect retryCount 10 is attached!", err.message);
        });
    });

    it('test retry interval args', function (done) {
        let start = 0;
        const taskfn = () => {
            start++;
            return new Promise((s, reject) => reject(Error('retryerr:' + start)));
        }
        let startTime =Date.now();
        retry(taskfn, { interval: 100 }, function (err) {
            assert.equal("retryerr:" + start, err.message);
        }).catch(err => {
            assert.equal(Date.now()-startTime > 5*100,true);
            assert.equal("expect retryCount 5 is attached!", err.message);
            done();
        });
    });
});
