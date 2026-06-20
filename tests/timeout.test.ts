import { timeoutPromise } from '../src/timeout';

describe('timeout', () => {
    it('should resolve with "timeout:<ms>" string', async () => {
        const result = await timeoutPromise(10);
        expect(result).toBe('timeout:10');
    });

    it('should resolve after approximately the given time', async () => {
        const start = Date.now();
        await timeoutPromise(50);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    it('should work with 0ms timeout', async () => {
        const result = await timeoutPromise(0);
        expect(result).toBe('timeout:0');
    });
});
