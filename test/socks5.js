const assert = require('assert');
const socks5 = require('../lib/socks5');
const { describe } = require('mocha');

describe('socks5', function () {

    it('test socks5 parse ip example', function () {
        const obj1 = socks5.parseSocks5Addr(Buffer.from('010102040822c3', 'hex'));
        assert.equal(obj1.dstAddr, '1.2.4.8');
        assert.equal(obj1.dstPort, 8899);

        const obj2 = socks5.parseSocks5Addr(Buffer.from('01b53abd171566', 'hex'));
        assert.equal(obj2.dstAddr, '181.58.189.23');
        assert.equal(obj2.dstPort, 5478);
    });

    it('test socks5 parse domain example', function () {
        const obj1 = socks5.parseSocks5Addr(Buffer.from('030d7777772e62616964752e636f6d044b', 'hex'));
        assert.equal(obj1.dstAddr, 'www.baidu.com');
        assert.equal(obj1.dstPort, 1099);

        const obj2 = socks5.parseSocks5Addr(Buffer.from('03196b6566646b612e313233312e6131323362616964752e636f6dfffe', 'hex'));
        assert.equal(obj2.dstAddr, 'kefdka.1231.a123baidu.com');
        assert.equal(obj2.dstPort, 65534);
    });

    it('test socks5 build  ipv4 example', function () {
        const buf1 = socks5.buildSocks5Addr("1.2.4.8",8899);
        assert.equal(buf1.toString('hex'), '010102040822c3');
        const buf2 = socks5.buildSocks5Addr("181.58.189.23",5478);
        assert.equal(buf2.toString('hex'), '01b53abd171566');
    });

    it('test socks5 build  domain example', function () {
        const buf1 = socks5.buildSocks5Addr("www.baidu.com",1099);
        assert.equal(buf1.toString('hex'), '030d7777772e62616964752e636f6d044b');
        const buf2 = socks5.buildSocks5Addr("kefdka.1231.a123baidu.com",65534);
        assert.equal(buf2.toString('hex'), '03196b6566646b612e313233312e6131323362616964752e636f6dfffe');
    });

    
});
