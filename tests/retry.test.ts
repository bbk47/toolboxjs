import retry from '../src/retry';

describe('retry', () => {
    it('should reject after default 5 retries', async () => {
        const failTask = () => Promise.reject(new Error('fail'));
        await expect(retry(failTask)).rejects.toThrow('expect retryCount 5 is attached!');
    });

    it('should reject after custom retry count', async () => {
        const failTask = () => Promise.reject(new Error('fail'));
        await expect(retry(failTask, { times: 10 })).rejects.toThrow(
            'expect retryCount 10 is attached!'
        );
    });

    it('should call errcall on each failure', async () => {
        let callCount = 0;
        const failTask = () => Promise.reject(new Error('err'));
        const errcall = jest.fn((err: Error) => {
            callCount++;
            expect(err.message).toBe('err');
        });
        await expect(retry(failTask, { times: 3 }, errcall)).rejects.toThrow();
        expect(errcall).toHaveBeenCalledTimes(3);
    });

    it('should resolve if task succeeds before max retries', async () => {
        let attempts = 0;
        const task = () => {
            attempts++;
            if (attempts < 3) return Promise.reject(new Error('not yet'));
            return Promise.resolve('success');
        };
        const result = await retry(task, { times: 5 });
        expect(result).toBe('success');
        expect(attempts).toBe(3);
    });

    it('should respect interval between retries', async () => {
        let start = 0;
        const failTask = () => Promise.reject(new Error('fail'));
        start = Date.now();
        await expect(retry(failTask, { times: 3, interval: 50 })).rejects.toThrow();
        expect(Date.now() - start).toBeGreaterThanOrEqual(3 * 50 - 10);
    });

    it('should work with 0 retry times', async () => {
        const failTask = () => Promise.reject(new Error('fail'));
        await expect(retry(failTask, { times: 0 })).rejects.toThrow(
            'expect retryCount 0 is attached!'
        );
    });

    it('should work without options', async () => {
        const failTask = () => Promise.reject(new Error('fail'));
        await expect(retry(failTask)).rejects.toThrow('expect retryCount 5 is attached!');
    });
});
