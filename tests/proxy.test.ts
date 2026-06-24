import { EventEmitter } from 'events';
import net from 'net';
import dgram from 'dgram';
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

    // 真实 socket 集成测试：UDP ASSOCIATE(cmd=0x03) 应开 UDP 中继并回复 BND.ADDR:PORT。
    it('should handle UDP ASSOCIATE: bind relay and reply BND addr/port', (done) => {
        const server = net.createServer((srvSock) => {
            createSocks5Proxy(
                srvSock,
                () => done(new Error('onConnect should not be called for UDP')),
                (udpSocket, ctrlSock) => {
                    expect(ctrlSock).toBe(srvSock);
                    const a = udpSocket.address();
                    expect(typeof a.port).toBe('number');
                    expect(a.port).toBeGreaterThan(0);
                    udpSocket.close();
                    ctrlSock.destroy();
                    server.close();
                    done();
                }
            );
        });
        server.listen(0, '127.0.0.1', () => {
            const port = (server.address() as net.AddressInfo).port;
            const cli = net.connect(port, '127.0.0.1', () => {
                // 先发 SOCKS5 greeting: VER NMETHODS METHODS
                cli.write(Buffer.from([0x05, 0x01, 0x00]));
            });
            let stage = 0;
            cli.on('data', (data: Buffer) => {
                if (stage === 0) {
                    expect(data).toEqual(Buffer.from([0x05, 0x00])); // no-auth
                    stage = 1;
                    // UDP ASSOCIATE 请求: VER CMD RSV ATYP DST.ADDR(0.0.0.0) DST.PORT(0)
                    cli.write(Buffer.from([0x05, 0x03, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
                } else if (stage === 1) {
                    // BND 回复: VER REP RSV ATYP=1 BND.ADDR(4) BND.PORT(2)
                    expect(data[0]).toBe(0x05);
                    expect(data[1]).toBe(0x00);
                    expect(data[3]).toBe(0x01);
                    expect(data.length).toBe(10);
                    const bndPort = data.readUInt16BE(8);
                    expect(bndPort).toBeGreaterThan(0);
                    stage = 2;
                }
            });
        });
    });

    it('should fall back to onConnect for UDP when no handler provided', (done) => {
        const { socket } = createMockSocket();
        createSocks5Proxy(socket as any, (addr, callback) => {
            // 未提供 onUdpAssociate 时，cmd=3 退化为普通 onConnect
            expect(addr).toBeInstanceOf(Buffer);
            callback(null);
            done();
        });
        socket.emit('data', Buffer.from([0x05, 0x01, 0x00]));
        socket.emit('data', Buffer.from([0x05, 0x03, 0x00, 0x01, 0x7f, 0x00, 0x00, 0x01, 0x1f, 0x90]));
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
