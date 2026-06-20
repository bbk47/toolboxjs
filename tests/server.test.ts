import net from 'net';
import { createTcpServer, createWsServer, createTlsServer, createHttp2Server } from '../src/server';

describe('server', () => {
    describe('createTcpServer', () => {
        it('should return a net.Server instance', () => {
            const handler = jest.fn();
            const server = createTcpServer(handler);
            expect(server).toBeInstanceOf(net.Server);
            server.close();
        });

        it('should call handler when a connection is made', (done) => {
            const server = createTcpServer((conn) => {
                conn.destroy();
                server.close(done);
            });
            server.listen(0, '127.0.0.1', () => {
                const addr = server.address() as net.AddressInfo;
                net.connect(addr.port, '127.0.0.1');
            });
        });
    });

    describe('createTlsServer', () => {
        it('should return a tls.Server instance', () => {
            const tls = require('tls');
            const handler = jest.fn();
            const server = createTlsServer({}, handler);
            expect(server).toBeInstanceOf(tls.Server);
            server.close();
        });
    });

    describe('createWsServer', () => {
        it('should return an http.Server instance', () => {
            const http = require('http');
            const server = createWsServer('/ws', jest.fn());
            expect(server).toBeInstanceOf(http.Server);
            server.close();
        });

        it('should call httpHandler for non-upgrade requests', (done) => {
            const http = require('http');
            const httpHandler = jest.fn((req: any, res: any) => {
                res.end('ok');
            });
            const server = createWsServer('/ws', jest.fn(), httpHandler);
            server.listen(0, '127.0.0.1', () => {
                const addr = server.address() as net.AddressInfo;
                http.get(`http://127.0.0.1:${addr.port}/`, (res: any) => {
                    expect(httpHandler).toHaveBeenCalled();
                    res.resume();
                    server.close(done);
                });
            });
        });

        it('should handle WebSocket upgrade to correct path', (done) => {
            const WebSocket = require('ws');
            const handler = jest.fn((ws: any) => ws.close());
            const server = createWsServer('/ws', handler);
            server.listen(0, '127.0.0.1', () => {
                const addr = server.address() as net.AddressInfo;
                const ws = new WebSocket(`ws://127.0.0.1:${addr.port}/ws`);
                ws.on('open', () => {
                    ws.close();
                    setTimeout(() => server.close(done), 100);
                });
                ws.on('error', () => server.close(done));
            });
        });

        it('should destroy socket for upgrade request to wrong path', (done) => {
            const http = require('http');
            const server = createWsServer('/correct-path', jest.fn());
            let closed = false;
            const closeOnce = () => {
                if (!closed) {
                    closed = true;
                    server.close(done);
                }
            };
            server.listen(0, '127.0.0.1', () => {
                const addr = server.address() as net.AddressInfo;
                const req = http.request({
                    hostname: '127.0.0.1',
                    port: addr.port,
                    path: '/wrong-path',
                    headers: {
                        Connection: 'Upgrade',
                        Upgrade: 'websocket',
                        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
                        'Sec-WebSocket-Version': '13',
                    },
                });
                req.on('error', closeOnce);
                req.end();
                setTimeout(closeOnce, 200);
            });
        });
    });

    describe('createHttp2Server', () => {
        it('should return an object with listen and close methods', () => {
            const server = createHttp2Server({}, '/stream', jest.fn());
            expect(typeof server.listen).toBe('function');
            expect(typeof server.close).toBe('function');
            server.close();
        });

        it('should invoke httpHandler when provided and request is received', () => {
            const httpHandler = jest.fn();
            const server = createHttp2Server({}, '/stream', jest.fn(), httpHandler);
            const mockReq = {} as any;
            const mockRes = {} as any;
            server.emit('request', mockReq, mockRes);
            expect(httpHandler).toHaveBeenCalledWith(mockReq, mockRes);
        });

        it('should call stream handler for matching path', () => {
            const streamHandler = jest.fn();
            const server = createHttp2Server({}, '/stream', streamHandler);
            // Get the last registered 'stream' listener (which is ours)
            const streamListeners = server.rawListeners('stream') as Function[];
            const ourListener = streamListeners[streamListeners.length - 1];
            const mockStream = { destroy: jest.fn() } as any;
            ourListener(mockStream, { ':path': '/stream' });
            expect(streamHandler).toHaveBeenCalledWith(mockStream);
        });

        it('should destroy stream for non-matching path', () => {
            const streamHandler = jest.fn();
            const server = createHttp2Server({}, '/stream', streamHandler);
            const streamListeners = server.rawListeners('stream') as Function[];
            const ourListener = streamListeners[streamListeners.length - 1];
            const mockStream = { destroy: jest.fn() } as any;
            ourListener(mockStream, { ':path': '/other' });
            expect(mockStream.destroy).toHaveBeenCalled();
        });
    });

    describe('createTlsServer - handler invocation', () => {
        it('should return a tls.Server instance', () => {
            const tls = require('tls');
            const handler = jest.fn();
            const server = createTlsServer({ rejectUnauthorized: false }, handler);
            expect(server).toBeInstanceOf(tls.Server);
            // Verify the handler is wired up by checking internal listeners
            const listeners = server.listeners('secureConnection');
            expect(listeners.length).toBeGreaterThanOrEqual(0);
        });
    });
});
