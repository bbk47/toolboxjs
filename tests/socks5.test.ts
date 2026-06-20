import { parseSocks5Addr, buildSocks5Addr, parseAddrInfo } from '../src/socks5';

describe('socks5', () => {
    describe('parseSocks5Addr', () => {
        it('should parse IPv4 address', () => {
            const obj = parseSocks5Addr(Buffer.from('010102040822c3', 'hex'));
            expect(obj.dstAddr).toBe('1.2.4.8');
            expect(obj.dstPort).toBe(8899);
        });

        it('should parse another IPv4 address', () => {
            const obj = parseSocks5Addr(Buffer.from('01b53abd171566', 'hex'));
            expect(obj.dstAddr).toBe('181.58.189.23');
            expect(obj.dstPort).toBe(5478);
        });

        it('should parse domain address', () => {
            const obj = parseSocks5Addr(Buffer.from('030d7777772e62616964752e636f6d044b', 'hex'));
            expect(obj.dstAddr).toBe('www.baidu.com');
            expect(obj.dstPort).toBe(1099);
        });

        it('should parse long domain address', () => {
            const obj = parseSocks5Addr(
                Buffer.from('03196b6566646b612e313233312e6131323362616964752e636f6dfffe', 'hex')
            );
            expect(obj.dstAddr).toBe('kefdka.1231.a123baidu.com');
            expect(obj.dstPort).toBe(65534);
        });

        it('should support offset parameter', () => {
            // 2 dummy prefix bytes + socks5 data
            const fullBuf = Buffer.from('0000' + '010102040822c3', 'hex');
            const obj = parseSocks5Addr(fullBuf, 2);
            expect(obj.dstAddr).toBe('1.2.4.8');
            expect(obj.dstPort).toBe(8899);
        });

        it('should return empty strings for unknown type', () => {
            const buf = Buffer.from([0x02, 0x00, 0x00]);
            const obj = parseSocks5Addr(buf);
            expect(obj.dstAddr).toBe('');
            expect(obj.dstPort).toBe(0);
        });
    });

    describe('buildSocks5Addr', () => {
        it('should build IPv4 address buffer', () => {
            const buf = buildSocks5Addr('1.2.4.8', 8899);
            expect(buf.toString('hex')).toBe('010102040822c3');
        });

        it('should build another IPv4 address buffer', () => {
            const buf = buildSocks5Addr('181.58.189.23', 5478);
            expect(buf.toString('hex')).toBe('01b53abd171566');
        });

        it('should build domain address buffer', () => {
            const buf = buildSocks5Addr('www.baidu.com', 1099);
            expect(buf.toString('hex')).toBe('030d7777772e62616964752e636f6d044b');
        });

        it('should build long domain address buffer', () => {
            const buf = buildSocks5Addr('kefdka.1231.a123baidu.com', 65534);
            expect(buf.toString('hex')).toBe(
                '03196b6566646b612e313233312e6131323362616964752e636f6dfffe'
            );
        });

        it('should handle port boundary values', () => {
            const buf = buildSocks5Addr('1.1.1.1', 256);
            const parsed = parseSocks5Addr(buf);
            expect(parsed.dstPort).toBe(256);
        });
    });

    describe('parseAddrInfo alias', () => {
        it('should be an alias for parseSocks5Addr', () => {
            expect(parseAddrInfo).toBe(parseSocks5Addr);
        });
    });
});
