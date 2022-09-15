function parseSocks5Addr(buf, offset) {
    if (offset !== 0) {
        buf = buf.slice(offset);
    }
    const type = buf.readUInt8(0);
    const addrData = buf.slice(1);
    let dstAddr;
    let dstPort;
    if (type === 0x1) {
        // IP
        const IP = addrData.slice(0, -2);
        const PORT = addrData.slice(-2);
        dstAddr = IP.map((temp) => Number(temp).toString(10)).join('.');
        dstPort = PORT[0] * 256 + PORT[1];
    } else if (type === 0x3) {
        const addrLen = addrData.readUInt8(0);
        const domain = addrData.slice(1, addrLen + 1);
        const port = addrData.slice(addrLen + 1);
        dstAddr = domain.toString();
        dstPort = port[0] * 256 + port[1];
    }
    return { dstAddr, dstPort };
}

function buildSocks5Addr(hostname, port) {
    var socksAddrInfoBuf;
    if (/^(\d+\.){3}\d+$/.test(hostname)) {
        const parts = hostname.split('.').map((p) => Number(p));
        const portBuf = Buffer.from([parseInt(port / 256), port % 256]);
        const preBuf = Buffer.from([0x01, parts[0], parts[1], parts[2], parts[3]]);
        socksAddrInfoBuf = Buffer.concat([preBuf, portBuf]);
    } else {
        const domain = hostname;
        const preBuf = Buffer.from([0x03, domain.length]);
        const domainBuf = Buffer.from(domain);
        const portBuf = Buffer.from([parseInt(port / 256), port % 256]);
        socksAddrInfoBuf = Buffer.concat([preBuf, domainBuf, portBuf]);
    }
    return socksAddrInfoBuf;
}

exports.parseAddrInfo = parseSocks5Addr;
exports.parseSocks5Addr = parseSocks5Addr;
exports.buildSocks5Addr = buildSocks5Addr;

// console.log(buildSocks5Addr('1.2.4.8', 8899).toString('hex'));
// console.log(buildSocks5Addr('181.58.189.23', 5478).toString('hex'));
// console.log(buildSocks5Addr('www.baidu.com', 1099).toString('hex'));
// console.log(buildSocks5Addr('kefdka.1231.a123baidu.com', 65534).toString('hex'));
