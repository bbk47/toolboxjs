import WebSocket from 'ws';
import net from 'net';
import { websocketSend, tcpsocketSend, bindWebsocket, bindStreamSocket } from './helper';
import type { DataCallback, ErrorCallback, CloseCallback } from './helper';

export type TransportType = 'ws' | 'h2' | 'tcp' | 'tls' | 'domainsocket';

export interface TransportConn {
    close?: () => void;
    destroy?: () => void;
    writable?: boolean;
    readyState?: number;
    send?: Function;
    on: (event: string, listener: Function) => any;
    write?: (data: Buffer) => void;
}

export class Transport {
    type: TransportType;
    conn: TransportConn;

    constructor(opts: { type: TransportType; conn: TransportConn }) {
        this.type = opts.type;
        this.conn = opts.conn;
    }

    sendPacket(binarydata: Buffer): void {
        if (this.type === 'ws') {
            websocketSend(this.conn as unknown as WebSocket, binarydata);
        } else {
            tcpsocketSend(this.conn as unknown as net.Socket, binarydata);
        }
    }

    bindEvents(onData: DataCallback, onError: ErrorCallback, onClose: CloseCallback): void {
        if (this.type === 'ws') {
            bindWebsocket(this.conn as unknown as WebSocket, onData, onError, onClose);
        } else {
            bindStreamSocket(this.conn as any, onData, onError, onClose);
        }
    }

    close(): void {
        try {
            if (this.type === 'ws' || this.type === 'h2') {
                (this.conn as any).close();
            } else {
                (this.conn as any).destroy();
            }
        } catch (_err) {
            // ignore
        }
    }
}
