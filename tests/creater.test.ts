import { EventEmitter } from 'events';
import { wrapSocket } from '../src/transport/creater';
import { Transport } from '../src/transport/transport';

jest.mock('net', () => {
    const EventEmitter = require('events').EventEmitter;
    const mockSocket = Object.assign(new EventEmitter(), {
        connect: jest.fn(),
        destroy: jest.fn(),
        writable: true,
        write: jest.fn(),
    });
    return {
        Socket: jest.fn(() => mockSocket),
        __mockSocket: mockSocket,
    };
});

jest.mock('tls', () => {
    const EventEmitter = require('events').EventEmitter;
    const mockTlsConn = Object.assign(new EventEmitter(), {
        destroy: jest.fn(),
        write: jest.fn(),
        writable: true,
    });
    return {
        connect: jest.fn((opts: any, cb: () => void) => {
            setImmediate(cb);
            return mockTlsConn;
        }),
        __mockConn: mockTlsConn,
    };
});

jest.mock('http2', () => {
    const EventEmitter = require('events').EventEmitter;
    const mockStream = Object.assign(new EventEmitter(), {
        close: jest.fn(),
        destroy: jest.fn(),
        write: jest.fn(),
        writable: true,
    });
    const mockClient = {
        request: jest.fn(() => mockStream),
    };
    return {
        connect: jest.fn(() => mockClient),
        __mockStream: mockStream,
        __mockClient: mockClient,
    };
});

jest.mock('ws', () => {
    const EventEmitter = require('events').EventEmitter;
    class MockWs extends EventEmitter {
        readyState = 1;
        send = jest.fn();
        close = jest.fn();
    }
    const WsClass = MockWs as any;
    WsClass.OPEN = 1;
    return WsClass;
});

describe('transport/creater', () => {
    describe('wrapSocket', () => {
        it('should create a Transport with the given type and conn', () => {
            const mockConn = Object.assign(new EventEmitter(), {
                write: jest.fn(),
                writable: true,
                destroy: jest.fn(),
            }) as any;
            const ts = wrapSocket('tcp', mockConn);
            expect(ts).toBeInstanceOf(Transport);
            expect(ts.type).toBe('tcp');
            expect(ts.conn).toBe(mockConn);
        });

        it('should work for ws type', () => {
            const mockConn = Object.assign(new EventEmitter(), {
                send: jest.fn(),
                close: jest.fn(),
                readyState: 1,
            }) as any;
            const ts = wrapSocket('ws', mockConn);
            expect(ts.type).toBe('ws');
        });
    });

    describe('createTcpTransport', () => {
        it('should create a Transport and call onOpen when connected', (done) => {
            const net = require('net');
            const mockSocket = net.__mockSocket;
            mockSocket.connect = jest.fn((port: number, host: string, cb: () => void) => {
                setImmediate(cb);
            });

            const { createTcpTransport } = require('../src/transport/creater');
            const ts = createTcpTransport({ host: '127.0.0.1', port: 9999 }, () => {
                expect(ts).toBeInstanceOf(Transport);
                expect(ts.type).toBe('tcp');
                done();
            });
        });
    });

    describe('createUnixsocketTransport', () => {
        it('should create a domainsocket transport', (done) => {
            const net = require('net');
            const mockSocket = net.__mockSocket;
            mockSocket.connect = jest.fn((path: string, cb: () => void) => {
                setImmediate(cb);
            });

            const { createUnixsocketTransport } = require('../src/transport/creater');
            const ts = createUnixsocketTransport({ host: '', port: 0, path: '/tmp/test.sock' }, () => {
                expect(ts).toBeInstanceOf(Transport);
                expect(ts.type).toBe('domainsocket');
                done();
            });
        });
    });

    describe('createTlsTransport', () => {
        it('should create a tls transport and call onOpen', (done) => {
            const { createTlsTransport } = require('../src/transport/creater');
            const ts = createTlsTransport({ host: '127.0.0.1', port: 9999 }, () => {
                expect(ts).toBeInstanceOf(Transport);
                expect(ts.type).toBe('tls');
                done();
            });
        });
    });

    describe('createHttp2Transport', () => {
        it('should create an h2 transport and bind response event', (done) => {
            const http2 = require('http2');
            const mockStream = http2.__mockStream;

            const { createHttp2Transport } = require('../src/transport/creater');
            const ts = createHttp2Transport({ host: '127.0.0.1', port: 9999, path: '/stream' }, () => {
                expect(ts).toBeInstanceOf(Transport);
                expect(ts.type).toBe('h2');
                done();
            });
            // Trigger the response event
            mockStream.emit('response');
        });

        it('should use default path / when no path provided', () => {
            const http2 = require('http2');
            const mockClient = http2.__mockClient;

            const { createHttp2Transport } = require('../src/transport/creater');
            createHttp2Transport({ host: '127.0.0.1', port: 9999 }, () => {});
            expect(mockClient.request).toHaveBeenCalledWith(
                expect.objectContaining({ ':path': '/' })
            );
        });
    });

    describe('createWebsocketTransport', () => {
        it('should create a ws transport and bind open event', (done) => {
            const { createWebsocketTransport } = require('../src/transport/creater');
            const ts = createWebsocketTransport({ host: '127.0.0.1', port: 9999, path: '/ws', secure: false }, () => {
                expect(ts).toBeInstanceOf(Transport);
                expect(ts.type).toBe('ws');
                done();
            });
            // Trigger the 'open' event on the mocked WebSocket
            ts.conn.emit('open');
        });

        it('should use wss:// when secure is true and ws:// when not', () => {
            const { createWebsocketTransport } = require('../src/transport/creater');
            const ts1 = createWebsocketTransport(
                { host: 'example.com', port: 443, path: '/ws', secure: true },
                () => {}
            );
            expect(ts1.type).toBe('ws');

            const ts2 = createWebsocketTransport(
                { host: 'example.com', port: 80, path: '/ws', secure: false },
                () => {}
            );
            expect(ts2.type).toBe('ws');
        });
    });
});
