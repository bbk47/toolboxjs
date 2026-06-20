import * as toolbox from '../src/index';

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

    it('should export BbkStream', () => {
        expect(typeof toolbox.BbkStream).toBe('function');
    });

    it('should export socks5 module', () => {
        expect(typeof toolbox.socks5.parseSocks5Addr).toBe('function');
        expect(typeof toolbox.socks5.buildSocks5Addr).toBe('function');
    });

    it('should export timeout module', () => {
        expect(typeof toolbox.timeout.timeoutPromise).toBe('function');
    });

    it('should export uuid', () => {
        expect(typeof toolbox.uuid).toBe('function');
    });
});
