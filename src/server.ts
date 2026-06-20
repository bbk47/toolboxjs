import net from 'net';
import http from 'http';
import tls from 'tls';
import http2 from 'http2';
import url from 'url';
import WebSocket from 'ws';

export type HttpHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;
export type WsHandler = (ws: WebSocket) => void;
export type StreamHandler = (stream: net.Socket | http2.ServerHttp2Stream) => void;
export type ConnHandler = (conn: net.Socket | tls.TLSSocket) => void;

export function createWsServer(
    workPath: string,
    handler: WsHandler,
    httpHandler?: HttpHandler
): http.Server {
    const server = http.createServer(function (req, res) {
        if (httpHandler) {
            httpHandler(req, res);
        }
    });
    // ws 2.x exposes Server as WebSocket.Server
    const WsServer = (WebSocket as any).Server as typeof WebSocket;
    const wss: any = new (WsServer as any)({ noServer: true, clientTracking: false });
    wss.on('connection', function (wsconn: WebSocket) {
        handler(wsconn);
    });
    server.on('upgrade', function (request, socket, head) {
        const pathname = url.parse(request.url || '').pathname;
        if (pathname === workPath) {
            wss.handleUpgrade(request, socket as net.Socket, head, function done(ws: WebSocket) {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });
    return server;
}

export function createHttp2Server(
    tlsOpts: tls.TlsOptions,
    workPath: string,
    handler: (stream: http2.ServerHttp2Stream) => void,
    httpHandler?: (req: http2.Http2ServerRequest, res: http2.Http2ServerResponse) => void
): http2.Http2SecureServer {
    const http2Opts = Object.assign({ allowHTTP1: true }, tlsOpts);
    const server = http2.createSecureServer(http2Opts, function (req, res) {
        if (httpHandler) {
            httpHandler(req, res);
        }
    });
    server.on('stream', function (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) {
        const path = headers[':path'];
        if (path === workPath) {
            handler(stream);
        } else {
            stream.destroy();
        }
    });
    return server;
}

export function createTcpServer(handler: ConnHandler): net.Server {
    const server = net.createServer(function (conn) {
        handler(conn);
    });
    return server;
}

export function createTlsServer(tlsOpts: tls.TlsOptions, handler: ConnHandler): tls.Server {
    const server = tls.createServer(tlsOpts, function (conn) {
        handler(conn);
    });
    return server;
}
