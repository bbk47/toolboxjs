export interface Socks5AddrInfo {
    dstAddr: string;
    dstPort: number;
}

export function parseSocks5Addr(buf: Buffer, offset = 0): Socks5AddrInfo {
    if (offset > 0) {
        buf = buf.slice(offset);
    }
    const type = buf.readUInt8(0);
    const addrData = buf.slice(1);
    let dstAddr = '';
    let dstPort = 0;

    if (type === 0x01) {
        const IP = addrData.slice(0, -2);
        const PORT = addrData.slice(-2);
        dstAddr = Array.from(IP)
            .map((temp) => Number(temp).toString(10))
            .join('.');
        dstPort = PORT[0] * 256 + PORT[1];
    } else if (type === 0x03) {
        const addrLen = addrData.readUInt8(0);
        const domain = addrData.slice(1, addrLen + 1);
        const port = addrData.slice(addrLen + 1);
        dstAddr = domain.toString();
        dstPort = port[0] * 256 + port[1];
    }
    return { dstAddr, dstPort };
}

export function buildSocks5Addr(hostname: string, port: number): Buffer {
    if (/^(\d+\.){3}\d+$/.test(hostname)) {
        const parts = hostname.split('.').map((p) => Number(p));
        const portBuf = Buffer.from([Math.floor(port / 256), port % 256]);
        const preBuf = Buffer.from([0x01, parts[0], parts[1], parts[2], parts[3]]);
        return Buffer.concat([preBuf, portBuf]);
    } else {
        const preBuf = Buffer.from([0x03, hostname.length]);
        const domainBuf = Buffer.from(hostname);
        const portBuf = Buffer.from([Math.floor(port / 256), port % 256]);
        return Buffer.concat([preBuf, domainBuf, portBuf]);
    }
}

export const parseAddrInfo = parseSocks5Addr;
