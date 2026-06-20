import WebSocket from 'ws';
import net from 'net';
import stream from 'stream';

export type DataCallback = (data: Buffer) => void;
export type ErrorCallback = (err: Error) => void;
export type CloseCallback = (code?: number) => void;

export function bindStreamSocket(
    s: stream.Readable & { on: Function; destroy: Function },
    onData: DataCallback,
    onError: ErrorCallback,
    onClose: CloseCallback
): void {
    let buffcache = Buffer.from([]);
    s.on('data', function (data: Buffer) {
        buffcache = Buffer.concat([buffcache, data]);
        while (true) {
            if (buffcache.length <= 2) {
                return;
            }
            const datalen = buffcache[0] * 256 + buffcache[1];
            if (buffcache.length < datalen + 2) {
                return;
            }
            const pack = buffcache.slice(2, datalen + 2);
            buffcache = buffcache.slice(datalen + 2);
            onData(pack);
        }
    });
    s.on('close', function (code?: number) {
        onClose(code);
    });
    s.on('error', function (err: Error) {
        (s as any).destroy();
        onError(err);
    });
}

export function bindWebsocket(
    ws: WebSocket,
    onData: DataCallback,
    onError: ErrorCallback,
    onClose: CloseCallback
): void {
    ws.on('message', onData);
    ws.on('close', (code: number) => {
        onClose(code);
    });
    ws.on('error', (err: Error) => {
        ws.close();
        onError(err);
    });
}

export function tcpsocketSend(socket: net.Socket, data: Buffer): void {
    const datalen = data.length;
    if (socket.writable) {
        socket.write(
            Buffer.concat([Buffer.from([datalen >> 8, datalen % 256]), data])
        );
    } else {
        throw new Error('socket cannot writeable!');
    }
}

export function websocketSend(ws: WebSocket, data: Buffer): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(data, { binary: true });
    } else {
        throw new Error('ws socket not open!' + ws.readyState);
    }
}
