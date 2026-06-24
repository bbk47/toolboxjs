import net from 'net';
import dgram from 'dgram';
import { buildSocks5Addr } from './socks5';

export type ConnectCallback = (err?: Error | null) => void;
export type OnConnect = (addr: Buffer, callback: ConnectCallback) => void;
// onUdpAssociate 在客户端发起 SOCKS5 UDP ASSOCIATE(cmd=0x03)时回调：
// udpSocket 是供 app 收发 UDP 数据报的本地中继 socket；ctrlSock 是 SOCKS5 控制
// 用的 TCP 连接，其关闭即代表 UDP 关联结束。
export type OnUdpAssociate = (udpSocket: dgram.Socket, ctrlSock: net.Socket) => void;

// ipToBuf 把 IP 字符串转为 socks5 地址字节（IPv4=4 字节, IPv6=16 字节）。
function ipToBuf(ip: string): { atyp: number; bytes: Buffer } {
    if (ip.indexOf('.') >= 0) {
        const parts = ip.split('.').map((p) => Number(p) & 0xff);
        return { atyp: 0x01, bytes: Buffer.from(parts) };
    }
    // IPv6：展开 "::" 后逐组解析为 16 字节
    const bytes = Buffer.alloc(16);
    let head = ip;
    let tail = '';
    const dbl = ip.indexOf('::');
    if (dbl >= 0) {
        head = ip.slice(0, dbl);
        tail = ip.slice(dbl + 2);
    }
    const headGroups = head ? head.split(':') : [];
    const tailGroups = tail ? tail.split(':') : [];
    headGroups.forEach((g, i) => {
        const v = parseInt(g, 16) || 0;
        bytes.writeUInt16BE(v, i * 2);
    });
    tailGroups.forEach((g, i) => {
        const v = parseInt(g, 16) || 0;
        bytes.writeUInt16BE(v, 16 - (tailGroups.length - i) * 2);
    });
    return { atyp: 0x04, bytes };
}

// buildUdpAssocReply 构造 UDP ASSOCIATE 成功响应：VER REP RSV ATYP BND.ADDR BND.PORT
function buildUdpAssocReply(address: string, port: number): Buffer {
    const { atyp, bytes } = ipToBuf(address);
    const head = Buffer.from([0x05, 0x00, 0x00, atyp]);
    const portBuf = Buffer.from([(port >> 8) & 0xff, port & 0xff]);
    return Buffer.concat([head, bytes, portBuf]);
}

export function createSocks5Proxy(cSock: net.Socket, onConnect: OnConnect, onUdpAssociate?: OnUdpAssociate): void {
    let stage = 'INIT';
    cSock.on('data', function dataListener(data: Buffer) {
        if (stage === 'INIT') {
            cSock.write('\x05\x00');
            stage = 'ADDR';
            return;
        } else if (stage === 'ADDR') {
            const cmd = data[1];
            // cmd: 0x01=CONNECT(TCP), 0x03=UDP ASSOCIATE
            if (cmd === 0x03 && onUdpAssociate) {
                stage = 'UDP';
                const host = cSock.localAddress || '127.0.0.1';
                const udp = dgram.createSocket(net.isIPv6(host) ? 'udp6' : 'udp4');
                udp.on('error', () => {
                    try {
                        udp.close();
                    } catch (e) {}
                    cSock.destroy();
                });
                udp.bind(0, host, () => {
                    const info = udp.address();
                    cSock.write(buildUdpAssocReply(info.address, info.port));
                    cSock.removeAllListeners('data');
                    onUdpAssociate(udp, cSock);
                });
                return;
            }
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
