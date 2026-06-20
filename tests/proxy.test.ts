import { EventEmitter } from 'events';
import { createSocks5Proxy, createConnectProxy } from '../src/proxy';

function createMockSocket() {
    const emitter = new EventEmitter();
    const written: Buffer[] = [];
    let destroyed = false;
    let paused = false;
    let listenersRemoved: string[] = [];

    const socket = Object.assign(emitter, {
        write(data: Buffer | string) {
            written.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
        },
        destroy() {
            destroyed = true;
            emitter.emit('_destroyed');
        },
        pause() {
            paused = true;
        },
        removeAllListeners(event?: string) {
            listenersRemoved.push(event || 'all');
            return EventEmitter.prototype.removeAllListeners.call(emitter, event);
        },
        _written: written,
        _destroyed: () => destroyed,
        _paused: () => paused,
    });

    return { socket, written, isDestroyed: () => destroyed, isPaused: () => paused };
}

describe('createSocks5Proxy', () => {
    it('should respond with 0x05 0x00 on INIT stage', () => {
        const { socket, written } = createMockSocket();
        createSocks5Proxy(socket as any, () => {});
        socket.emit('data', Buffer.from([0x05, 0x01, 0x00]));
        expect(written[0]).toEqual(Buffer.from([0x05, 0x00]));
    });

    it('should call onConnect and send success response on ADDR stage', (done) => {
        const { socket, written } = createMockSocket();
        createSocks5Proxy(socket as any, (addr, callback) => {
            expect(addr).toBeInstanceOf(Buffer);
            callback(null);
        });

        socket.emit('data', Buffer.from([0x05, 0x01, 0x00]));
        socket.emit('data', Buffer.from([0x05, 0x01, 0x00, 0x01, 0x7f, 0x00, 0x00, 0x01, 0x1f, 0x90]));

        setImmediate(() => {
            const successResp = Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
            expect(written[1]).toEqual(successResp);
            done();
        });
    });

    it('should destroy socket when onConnect calls back with error', (done) => {
        const { socket, isDestroyed } = createMockSocket();
        createSocks5Proxy(socket as any, (_addr, callback) => {
            callback(new Error('connection refused'));
        });

        socket.emit('data', Buffer.from([0x05, 0x01, 0x00]));
        socket.emit('data', Buffer.from([0x05, 0x01, 0x00, 0x01, 0x7f, 0x00, 0x00, 0x01, 0x1f, 0x90]));

        setImmediate(() => {
            expect(isDestroyed()).toBe(true);
            done();
        });
    });

    it('should destroy socket on error event', () => {
        const { socket, isDestroyed } = createMockSocket();
        createSocks5Proxy(socket as any, () => {});
        socket.emit('error', new Error('socket error'));
        expect(isDestroyed()).toBe(true);
    });

    it('should do nothing when stage is STREAM (data arrives after handshake)', (done) => {
        const { socket } = createMockSocket();
        createSocks5Proxy(socket as any, (_addr, callback) => {
            callback(null);
        });
        // Complete handshake
        socket.emit('data', Buffer.from([0x05, 0x01, 0x00]));
        socket.emit('data', Buffer.from([0x05, 0x01, 0x00, 0x01, 0x7f, 0x00, 0x00, 0x01, 0x1f, 0x90]));
        setImmediate(done);
    });

    it('should pause the socket after successful connection', (done) => {
        const { socket, isPaused } = createMockSocket();
        createSocks5Proxy(socket as any, (_addr, callback) => {
            callback(null);
        });

        socket.emit('data', Buffer.from([0x05, 0x01, 0x00]));
        socket.emit('data', Buffer.from([0x05, 0x01, 0x00, 0x01, 0x7f, 0x00, 0x00, 0x01, 0x1f, 0x90]));

        setImmediate(() => {
            expect(isPaused()).toBe(true);
            done();
        });
    });
});

describe('createConnectProxy', () => {
    it('should destroy socket for non-CONNECT method', () => {
        const { socket, isDestroyed } = createMockSocket();
        createConnectProxy(socket as any, () => {});
        socket.emit('data', Buffer.from('GET / HTTP/1.1\r\n\r\n'));
        expect(isDestroyed()).toBe(true);
    });

    it('should parse CONNECT request and call onConnect', (done) => {
        const { socket, written } = createMockSocket();
        createConnectProxy(socket as any, (addr, callback) => {
            expect(addr).toBeInstanceOf(Buffer);
            callback(null);
        });

        socket.emit('data', Buffer.from('CONNECT example.com:443 HTTP/1.1\r\n\r\n'));

        setImmediate(() => {
            const response = written[0].toString();
            expect(response).toContain('200 Connection Established');
            done();
        });
    });

    it('should destroy socket when onConnect fails', (done) => {
        const { socket, isDestroyed } = createMockSocket();
        createConnectProxy(socket as any, (_addr, callback) => {
            callback(new Error('refused'));
        });

        socket.emit('data', Buffer.from('CONNECT example.com:443 HTTP/1.1\r\n\r\n'));

        setImmediate(() => {
            expect(isDestroyed()).toBe(true);
            done();
        });
    });

    it('should destroy socket on error event', () => {
        const { socket, isDestroyed } = createMockSocket();
        createConnectProxy(socket as any, () => {});
        socket.emit('error', new Error('socket error'));
        expect(isDestroyed()).toBe(true);
    });

    it('should call onConnect with IPv4 address buffer for IP:port', (done) => {
        const { socket } = createMockSocket();
        createConnectProxy(socket as any, (addr, callback) => {
            expect(addr[0]).toBe(0x01);
            callback(null);
        });
        socket.emit('data', Buffer.from('CONNECT 1.2.3.4:80 HTTP/1.1\r\n\r\n'));
        setImmediate(done);
    });

    it('should pause socket after successful CONNECT', (done) => {
        const { socket, isPaused } = createMockSocket();
        createConnectProxy(socket as any, (_addr, callback) => {
            callback(null);
        });

        socket.emit('data', Buffer.from('CONNECT example.com:443 HTTP/1.1\r\n\r\n'));

        setImmediate(() => {
            expect(isPaused()).toBe(true);
            done();
        });
    });
});
