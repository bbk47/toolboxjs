import * as toolbox from '../src/index';
import * as transportIndex from '../src/transport/index';

describe('src/index.ts - main exports', () => {
    it('should export deferred', () => {
        expect(typeof toolbox.deferred).toBe('function');
    });

    it('should export encrypt module with Encryptor', () => {
        expect(typeof toolbox.encrypt.Encryptor).toBe('function');
    });

    it('should export logger', () => {
        expect(typeof toolbox.logger).toBe('function');
    });

    it('should export md5', () => {
        expect(typeof toolbox.md5).toBe('function');
    });

    it('should export merge', () => {
        expect(typeof toolbox.merge).toBe('function');
    });

    it('should export proxy with createSocks5Proxy and createConnectProxy', () => {
        expect(typeof toolbox.proxy.createSocks5Proxy).toBe('function');
        expect(typeof toolbox.proxy.createConnectProxy).toBe('function');
    });

    it('should export retry', () => {
        expect(typeof toolbox.retry).toBe('function');
    });

    it('should export server module', () => {
        expect(typeof toolbox.server.createTcpServer).toBe('function');
        expect(typeof toolbox.server.createWsServer).toBe('function');
    });

    it('should export socks5 module', () => {
        expect(typeof toolbox.socks5.parseSocks5Addr).toBe('function');
        expect(typeof toolbox.socks5.buildSocks5Addr).toBe('function');
    });

    it('should export timeout module', () => {
        expect(typeof toolbox.timeout.timeoutPromise).toBe('function');
    });

    it('should export transport module', () => {
        expect(typeof toolbox.transport.Transport).toBe('function');
    });

    it('should export uuid', () => {
        expect(typeof toolbox.uuid).toBe('function');
    });
});

describe('src/transport/index.ts - transport exports', () => {
    it('should export Transport class', () => {
        expect(typeof transportIndex.Transport).toBe('function');
    });

    it('should export creater module', () => {
        expect(typeof transportIndex.creater).toBe('object');
        expect(typeof transportIndex.creater.createTcpTransport).toBe('function');
    });

    it('should export helper module', () => {
        expect(typeof transportIndex.helper).toBe('object');
        expect(typeof transportIndex.helper.tcpsocketSend).toBe('function');
    });

    it('should export wrapSocket function', () => {
        expect(typeof transportIndex.wrapSocket).toBe('function');
    });

    it('should create a transport via wrapSocket', () => {
        const { EventEmitter } = require('events');
        const mockConn = Object.assign(new EventEmitter(), {
            write: jest.fn(),
            writable: true,
            destroy: jest.fn(),
        });
        const ts = transportIndex.wrapSocket('tcp', mockConn);
        expect(ts).toBeInstanceOf(transportIndex.Transport);
        expect(ts.type).toBe('tcp');
    });
});
