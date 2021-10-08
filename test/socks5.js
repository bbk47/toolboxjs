const assert = require('assert');
const socks5 = require('../lib/socks5');
const { describe } = require('mocha');

describe('socks5', function () {
    it('test socks5 ipv4 example', function () {
        const obj1 = { type: 1, addr: '1.2.4.8' };
        const buf = Buffer.from([0x01, 0x01, 0x02, 0x04, 0x08, 0x00, 0x50]);
        const obj = socks5.parseAddrInfo(buf);
        assert.equal(obj.dstAddr, '1.2.4.8');
        assert.equal(obj.dstPort, 80);
    });

    it('test socks5 domain example', function () {
        const obj1 = { type: 3, addr: 'www.baidu.com' };
        const buf1 = Buffer.from([0x03, 0x0d]);
        const buf = Buffer.concat([buf1, Buffer.from('www.baidu.com'), Buffer.from([0x00, 0x17])]);
        const obj = socks5.parseAddrInfo(buf);
        // console.log(obj);
        assert.equal(obj.dstAddr, 'www.baidu.com');
        assert.equal(obj.dstPort, 23);
    });
});
