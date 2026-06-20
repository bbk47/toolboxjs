import WebSocket from 'ws';
import net from 'net';
import http2 from 'http2';
import tls from 'tls';
import { Transport, TransportConn } from './transport';

export interface TransportParams {
    host: string;
    port: number;
    path?: string;
    secure?: boolean;
}

export function createWebsocketTransport(
    params: TransportParams,
    onOpen: () => void
): Transport {
    const tunnelWsUrl = `${params.secure ? 'wss' : 'ws'}://${params.host}:${params.port}${params.path || ''}`;
    const ws = new WebSocket(tunnelWsUrl, {
        perMessageDeflate: false,
        handshakeTimeout: 3000,
    } as any);
    const ts = new Transport({ type: 'ws', conn: ws as unknown as TransportConn });
    ws.on('open', onOpen);
    return ts;
}

export function createHttp2Transport(
    params: TransportParams,
    onOpen: () => void
): Transport {
    const http2Url = `https://${params.host}:${params.port}`;
    const client = http2.connect(http2Url, {
        rejectUnauthorized: false,
        requestCert: true,
    });
    const http2stream = client.request({
        ':method': 'POST',
        ':path': params.path || '/',
        'Content-Type': 'octet-stream',
    });
    http2stream.on('response', onOpen);
    const ts = new Transport({ type: 'h2', conn: http2stream as unknown as TransportConn });
    return ts;
}

export function createTlsTransport(
    params: TransportParams,
    onOpen: () => void
): Transport {
    const tlsOpts: tls.ConnectionOptions = {
        rejectUnauthorized: false,
        host: params.host,
        port: params.port,
    };
    const tlsConn = tls.connect(tlsOpts, function () {
        onOpen();
    });
    const ts = new Transport({ type: 'tls', conn: tlsConn as unknown as TransportConn });
    return ts;
}

export function createTcpTransport(
    params: TransportParams,
    onOpen: () => void
): Transport {
    const socket = new net.Socket();
    socket.connect(params.port, params.host, function () {
        onOpen();
    });
    return new Transport({ type: 'tcp', conn: socket as unknown as TransportConn });
}

export function createUnixsocketTransport(
    params: TransportParams,
    onOpen: () => void
): Transport {
    const socket = new net.Socket();
    socket.connect(params.path || '', function () {
        onOpen();
    });
    const ts = new Transport({ type: 'domainsocket', conn: socket as unknown as TransportConn });
    return ts;
}

export function wrapSocket(type: string, conn: TransportConn): Transport {
    return new Transport({ type: type as any, conn });
}
