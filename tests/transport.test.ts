import { EventEmitter } from 'events';
import { Transport } from '../src/transport/transport';
import {
    bindStreamSocket,
    bindWebsocket,
    tcpsocketSend,
    websocketSend,
} from '../src/transport/helper';

const WS_OPEN = 1;
const WS_CLOSED = 3;

function createMockWs() {
    const emitter = new EventEmitter();
    const sent: Buffer[] = [];
    const ws = Object.assign(emitter, {
        readyState: WS_OPEN,
        send: jest.fn((data: Buffer, _opts: any) => sent.push(data)),
        close: jest.fn(),
        _sent: sent,
    });
    return ws;
}

function createMockSocket() {
    const emitter = new EventEmitter();
    const written: Buffer[] = [];
    const socket = Object.assign(emitter, {
        writable: true,
        write: jest.fn((data: Buffer) => written.push(data)),
        destroy: jest.fn(),
        _written: written,
    });
    return socket;
}

describe('Transport', () => {
    describe('sendPacket (ws)', () => {
        it('should call websocketSend for ws type', () => {
            const ws = createMockWs();
            const ts = new Transport({ type: 'ws', conn: ws as any });
            const data = Buffer.from('hello');
            ts.sendPacket(data);
            expect(ws.send).toHaveBeenCalledWith(data, { binary: true });
        });

        it('should throw if ws is not open', () => {
            const ws = createMockWs();
            ws.readyState = WS_CLOSED;
            const ts = new Transport({ type: 'ws', conn: ws as any });
            expect(() => ts.sendPacket(Buffer.from('x'))).toThrow('ws socket not open!');
        });
    });

    describe('sendPacket (tcp)', () => {
        it('should call tcpsocketSend for tcp type', () => {
            const socket = createMockSocket();
            const ts = new Transport({ type: 'tcp', conn: socket as any });
            const data = Buffer.from('hello');
            ts.sendPacket(data);
            expect(socket.write).toHaveBeenCalled();
            const written = socket._written[0];
            expect(written[0]).toBe(data.length >> 8);
            expect(written[1]).toBe(data.length % 256);
        });

        it('should throw when socket is not writable', () => {
            const socket = createMockSocket();
            socket.writable = false;
            const ts = new Transport({ type: 'tcp', conn: socket as any });
            expect(() => ts.sendPacket(Buffer.from('x'))).toThrow('socket cannot writeable!');
        });
    });

    describe('bindEvents (ws)', () => {
        it('should bind message/close/error events for ws type', () => {
            const ws = createMockWs();
            const ts = new Transport({ type: 'ws', conn: ws as any });
            const onData = jest.fn();
            const onError = jest.fn();
            const onClose = jest.fn();
            ts.bindEvents(onData, onError, onClose);

            ws.emit('message', Buffer.from('data'));
            expect(onData).toHaveBeenCalledWith(Buffer.from('data'));

            ws.emit('close', 1000);
            expect(onClose).toHaveBeenCalledWith(1000);

            const err = new Error('ws error');
            ws.emit('error', err);
            expect(onError).toHaveBeenCalledWith(err);
            expect(ws.close).toHaveBeenCalled();
        });
    });

    describe('bindEvents (tcp)', () => {
        it('should bind data/close/error events for tcp type', () => {
            const socket = createMockSocket();
            const ts = new Transport({ type: 'tcp', conn: socket as any });
            const onData = jest.fn();
            const onError = jest.fn();
            const onClose = jest.fn();
            ts.bindEvents(onData, onError, onClose);

            const data = Buffer.from('hello');
            const frame = Buffer.concat([Buffer.from([0, data.length]), data]);
            socket.emit('data', frame);
            expect(onData).toHaveBeenCalledWith(data);

            socket.emit('close', 0);
            expect(onClose).toHaveBeenCalledWith(0);
        });
    });

    describe('close', () => {
        it('should call close() for ws type', () => {
            const ws = createMockWs();
            const ts = new Transport({ type: 'ws', conn: ws as any });
            ts.close();
            expect(ws.close).toHaveBeenCalled();
        });

        it('should call close() for h2 type', () => {
            const conn = { close: jest.fn(), on: jest.fn() };
            const ts = new Transport({ type: 'h2', conn: conn as any });
            ts.close();
            expect(conn.close).toHaveBeenCalled();
        });

        it('should call destroy() for tcp type', () => {
            const socket = createMockSocket();
            const ts = new Transport({ type: 'tcp', conn: socket as any });
            ts.close();
            expect(socket.destroy).toHaveBeenCalled();
        });

        it('should call destroy() for tls type', () => {
            const socket = createMockSocket();
            const ts = new Transport({ type: 'tls', conn: socket as any });
            ts.close();
            expect(socket.destroy).toHaveBeenCalled();
        });

        it('should silently catch errors during close', () => {
            const ws = createMockWs();
            ws.close.mockImplementation(() => { throw new Error('close error'); });
            const ts = new Transport({ type: 'ws', conn: ws as any });
            expect(() => ts.close()).not.toThrow();
        });
    });
});

describe('helper - bindStreamSocket', () => {
    it('should buffer and emit framed packets', () => {
        const emitter = new EventEmitter() as any;
        emitter.destroy = jest.fn();
        const onData = jest.fn();
        const onError = jest.fn();
        const onClose = jest.fn();

        bindStreamSocket(emitter, onData, onError, onClose);

        const payload = Buffer.from('hello world');
        const frame = Buffer.concat([
            Buffer.from([0, payload.length]),
            payload,
        ]);
        emitter.emit('data', frame);
        expect(onData).toHaveBeenCalledWith(payload);
    });

    it('should handle split packets (partial data)', () => {
        const emitter = new EventEmitter() as any;
        emitter.destroy = jest.fn();
        const onData = jest.fn();

        bindStreamSocket(emitter, onData, jest.fn(), jest.fn());

        const payload = Buffer.from('split');
        const frame = Buffer.concat([Buffer.from([0, payload.length]), payload]);
        emitter.emit('data', frame.slice(0, 2));
        expect(onData).not.toHaveBeenCalled();
        emitter.emit('data', frame.slice(2));
        expect(onData).toHaveBeenCalledWith(payload);
    });

    it('should handle multiple frames in one data event', () => {
        const emitter = new EventEmitter() as any;
        emitter.destroy = jest.fn();
        const onData = jest.fn();

        bindStreamSocket(emitter, onData, jest.fn(), jest.fn());

        const p1 = Buffer.from('foo');
        const p2 = Buffer.from('bar');
        const f1 = Buffer.concat([Buffer.from([0, p1.length]), p1]);
        const f2 = Buffer.concat([Buffer.from([0, p2.length]), p2]);
        emitter.emit('data', Buffer.concat([f1, f2]));
        expect(onData).toHaveBeenCalledTimes(2);
    });

    it('should call onClose on close event', () => {
        const emitter = new EventEmitter() as any;
        emitter.destroy = jest.fn();
        const onClose = jest.fn();
        bindStreamSocket(emitter, jest.fn(), jest.fn(), onClose);
        emitter.emit('close', 0);
        expect(onClose).toHaveBeenCalledWith(0);
    });

    it('should call onError and destroy on error event', () => {
        const emitter = new EventEmitter() as any;
        emitter.destroy = jest.fn();
        const onError = jest.fn();
        bindStreamSocket(emitter, jest.fn(), onError, jest.fn());
        const err = new Error('socket err');
        emitter.emit('error', err);
        expect(onError).toHaveBeenCalledWith(err);
        expect(emitter.destroy).toHaveBeenCalled();
    });

    it('should return early when buffer has <= 2 bytes', () => {
        const emitter = new EventEmitter() as any;
        emitter.destroy = jest.fn();
        const onData = jest.fn();
        bindStreamSocket(emitter, onData, jest.fn(), jest.fn());
        emitter.emit('data', Buffer.from([0x00]));
        expect(onData).not.toHaveBeenCalled();
    });

    it('should return early when header is received but payload is incomplete', () => {
        const emitter = new EventEmitter() as any;
        emitter.destroy = jest.fn();
        const onData = jest.fn();
        bindStreamSocket(emitter, onData, jest.fn(), jest.fn());

        // Send a header saying payload is 10 bytes, but only send 5 bytes of payload
        const header = Buffer.from([0x00, 0x0a]); // length = 10
        const partial = Buffer.from([1, 2, 3, 4, 5]); // only 5 bytes
        emitter.emit('data', Buffer.concat([header, partial]));
        expect(onData).not.toHaveBeenCalled();
    });
});

describe('helper - tcpsocketSend', () => {
    it('should prepend 2-byte length header', () => {
        const socket = createMockSocket();
        const data = Buffer.from('hello');
        tcpsocketSend(socket as any, data);
        const written = socket._written[0];
        const len = written[0] * 256 + written[1];
        expect(len).toBe(data.length);
        expect(written.slice(2)).toEqual(data);
    });

    it('should throw when socket is not writable', () => {
        const socket = createMockSocket();
        socket.writable = false;
        expect(() => tcpsocketSend(socket as any, Buffer.from('x'))).toThrow(
            'socket cannot writeable!'
        );
    });
});

describe('helper - websocketSend', () => {
    it('should call ws.send with binary option', () => {
        const ws = createMockWs();
        const data = Buffer.from('test');
        websocketSend(ws as any, data);
        expect(ws.send).toHaveBeenCalledWith(data, { binary: true });
    });

    it('should throw when ws is not open', () => {
        const ws = createMockWs();
        ws.readyState = WS_CLOSED;
        expect(() => websocketSend(ws as any, Buffer.from('x'))).toThrow('ws socket not open!');
    });
});

describe('helper - bindWebsocket', () => {
    it('should bind message/close/error events', () => {
        const ws = createMockWs();
        const onData = jest.fn();
        const onError = jest.fn();
        const onClose = jest.fn();
        bindWebsocket(ws as any, onData, onError, onClose);

        ws.emit('message', Buffer.from('hello'));
        expect(onData).toHaveBeenCalled();

        ws.emit('close', 1001);
        expect(onClose).toHaveBeenCalledWith(1001);

        ws.emit('error', new Error('ws err'));
        expect(onError).toHaveBeenCalled();
        expect(ws.close).toHaveBeenCalled();
    });
});
