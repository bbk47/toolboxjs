import deferred from '../src/deferred';

describe('deferred', () => {
    it('should resolve with the given value', async () => {
        const defer = deferred<string>();
        setTimeout(() => defer.resolve('okok'), 10);
        const result = await defer.promise;
        expect(result).toBe('okok');
    });

    it('should reject with the given reason', async () => {
        const defer = deferred<string>();
        setTimeout(() => defer.reject('err111'), 10);
        await expect(defer.promise).rejects.toBe('err111');
    });

    it('should expose promise, resolve, and reject properties', () => {
        const defer = deferred();
        expect(defer.promise).toBeInstanceOf(Promise);
        expect(typeof defer.resolve).toBe('function');
        expect(typeof defer.reject).toBe('function');
    });

    it('should support typed deferred', async () => {
        const defer = deferred<number>();
        defer.resolve(42);
        const result = await defer.promise;
        expect(result).toBe(42);
    });
});
