const assert = require('assert');
const { describe } = require('mocha');
const encrypt = require('../lib/encrypt');

describe('encrypt', function () {
    it('test encrypt example', function () {
        const worker = new encrypt.Encryptor('csii2019', 'aes-256-cfb');

        const result1 = worker.encrypt(Buffer.from('hello,world'));
        const result2 = worker.encrypt(Buffer.from('818c9ba2109b4c505155aebf6d3647a3'));
        const result3 = worker.encrypt(Buffer.from('818c9ba2109b4c505155aebf6d3647a2'));

        // console.log(result1.toString('hex'));
        // console.log(result2.toString('hex'));
        // console.log(result3.toString('hex'));

        const desret1 = worker.decrypt(result1).toString();
        const desret2 = worker.decrypt(result2).toString();
        const desret3 = worker.decrypt(result3).toString();

        assert.equal(desret1, 'hello,world', 'encrypt example1');
        assert.equal(desret2, '818c9ba2109b4c505155aebf6d3647a3');
        assert.equal(desret3, '818c9ba2109b4c505155aebf6d3647a2');
    });
});
