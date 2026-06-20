import BbkStream from '../src/stream';

const tick = () => new Promise<void>((r) => setImmediate(r));
const sum = (arr: Buffer[]) => arr.reduce((a, b) => a + b.length, 0);

describe('BbkStream', () => {
    it('发送窗口：窗口耗尽则挂起，收到 WINDOW_UPDATE 后继续', async () => {
        const sent: Buffer[] = [];
        const s = new BbkStream(
            (chunk) => sent.push(chunk),
            () => {},
            { windowSize: 100 }
        );

        let cbCalled = 0;
        s.write(Buffer.alloc(250, 1), () => cbCalled++);
        await tick();

        // 初始窗口 100，只能发出 100 字节，写回调尚未完成
        expect(sum(sent)).toBe(100);
        expect(cbCalled).toBe(0);

        s.handleWindowUpdate(100);
        expect(sum(sent)).toBe(200);
        expect(cbCalled).toBe(0);

        s.handleWindowUpdate(100);
        expect(sum(sent)).toBe(250); // 全部发完
        expect(cbCalled).toBe(1); // 整块写完成
    });

    it('发送窗口：大块数据跨多个窗口分片，不死锁', async () => {
        const sent: Buffer[] = [];
        const s = new BbkStream(
            (chunk) => sent.push(chunk),
            () => {},
            { windowSize: 50 }
        );
        s.write(Buffer.alloc(120, 7));
        await tick();
        expect(sum(sent)).toBe(50);
        s.handleWindowUpdate(1000);
        expect(sum(sent)).toBe(120);
    });

    it('接收窗口：按阈值（窗口一半）发送 WINDOW_UPDATE', async () => {
        const updates: number[] = [];
        const s = new BbkStream(
            () => {},
            (n) => updates.push(n),
            { windowSize: 100 } // 阈值 50
        );
        s.on('data', () => {}); // 进入流动模式，触发消费
        await tick();

        s.produce(Buffer.alloc(40));
        await tick();
        expect(updates.length).toBe(0); // 未达阈值不发更新

        s.produce(Buffer.alloc(20));
        await tick();
        expect(updates.length).toBe(1); // 达到阈值发一次更新
        expect(updates[0]).toBe(60);
    });

    it('接收侧：空 produce / cache 为空不会 push 空 buffer 或误发更新', async () => {
        const updates: number[] = [];
        let dataCount = 0;
        const s = new BbkStream(
            () => {},
            (n) => updates.push(n),
            { windowSize: 100 }
        );
        s.on('data', (d: Buffer) => {
            dataCount++;
            expect(d.length > 0).toBe(true); // push 的 buffer 非空
        });
        await tick();
        s.produce(Buffer.alloc(0)); // 空
        s.produce(null);
        await tick();
        expect(dataCount).toBe(0);
        expect(updates.length).toBe(0);
    });

    it('半关闭：end() 触发 localfin', async () => {
        const s = new BbkStream(
            () => {},
            () => {}
        );
        let fin = false;
        s.on('localfin', () => (fin = true));
        s.end();
        await tick();
        expect(fin).toBe(true);
    });

    it('半关闭：remoteFinish() 结束可读侧，但可写侧仍可用', async () => {
        const sent: Buffer[] = [];
        const s = new BbkStream(
            (c) => sent.push(c),
            () => {}
        );
        let ended = false;
        s.on('data', () => {});
        s.on('end', () => (ended = true));
        await tick();

        s.produce(Buffer.from('hello'));
        s.remoteFinish();
        await tick();
        expect(ended).toBe(true); // 可读侧已结束

        // 可写侧仍可继续发送
        s.write(Buffer.from('world'));
        await tick();
        expect(sum(sent)).toBe(5);
    });

    it('remoteReset()：销毁且不回发 localreset', async () => {
        const s = new BbkStream(
            () => {},
            () => {}
        );
        let reset = false;
        let closed = false;
        s.on('localreset', () => (reset = true));
        s.on('close', () => (closed = true));
        s.remoteReset();
        await tick();
        expect(reset).toBe(false); // 对端发起的复位不应回发 RST
        expect(closed).toBe(true);
    });

    it('异常 destroy()：回发 localreset', async () => {
        const s = new BbkStream(
            () => {},
            () => {}
        );
        let reset = false;
        s.on('localreset', () => (reset = true));
        s.on('error', () => {});
        s.destroy();
        await tick();
        expect(reset).toBe(true);
    });

    it('优雅双向关闭：不回发 localreset', async () => {
        const s = new BbkStream(
            () => {},
            () => {}
        );
        let reset = false;
        s.on('localreset', () => (reset = true));
        s.on('data', () => {});
        s.end(); // 写端结束
        s.remoteFinish(); // 读端结束
        await tick();
        await tick();
        expect(reset).toBe(false);
    });
});
