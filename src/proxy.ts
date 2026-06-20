import net from 'net';
import { buildSocks5Addr } from './socks5';

export type ConnectCallback = (err?: Error | null) => void;
export type OnConnect = (addr: Buffer, callback: ConnectCallback) => void;

export function createSocks5Proxy(cSock: net.Socket, onConnect: OnConnect): void {
    let stage = 'INIT';
    cSock.on('data', function dataListener(data: Buffer) {
        if (stage === 'INIT') {
            cSock.write('\x05\x00');
            stage = 'ADDR';
            return;
        } else if (stage === 'ADDR') {
            onConnect(data.slice(3), (err) => {
                if (!err) {
                    stage = 'STREAM';
                    cSock.write('\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00');
                    cSock.removeAllListeners('data');
                    cSock.pause();
                } else {
                    cSock.destroy();
                }
            });
            return;
        }
    });

    cSock.on('error', () => {
        cSock.destroy();
    });
}

export function createConnectProxy(cSock: net.Socket, onConnect: OnConnect): void {
    let stage = 'INIT';
    cSock.on('data', (data: Buffer) => {
        if (stage === 'INIT') {
            const str = data.toString('ascii');
            const lines = str.split(/\s/g);
            if (lines[0] !== 'CONNECT') {
                cSock.destroy();
                return;
            }
            const hoststr = lines[1];
            const reqhost = hoststr.split(':');
            const hostname = reqhost[0];
            const port = Number(reqhost[1]);
            const socksAddrInfo = buildSocks5Addr(hostname, port);
            onConnect(socksAddrInfo, (err) => {
                if (!err) {
                    cSock.write(Buffer.from('HTTP/1.1 200 Connection Established\r\n\r\n'));
                    stage = 'STREAM';
                    cSock.removeAllListeners('data');
                    cSock.pause();
                } else {
                    cSock.destroy();
                }
            });
        }
    });

    cSock.on('error', () => {
        cSock.destroy();
    });
}
