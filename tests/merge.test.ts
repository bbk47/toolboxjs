import merge from '../src/merge';

describe('merge', () => {
    it('should merge multiple sources into target', () => {
        const result = merge({ sss: 1 }, { sss: 123 }, { bb: 456 }, { sss: null });
        expect(result.sss).toBe(123);
        expect(result.bb).toBe(456);
    });

    it('should not override with null values', () => {
        const result = merge({ a: 'original' }, { a: null });
        expect(result.a).toBe('original');
    });

    it('should not override with undefined values', () => {
        const result = merge({ a: 'original' }, { a: undefined });
        expect(result.a).toBe('original');
    });

    it('should skip null sources', () => {
        const result = merge({ a: 1 }, null, { b: 2 });
        expect(result.a).toBe(1);
        expect(result.b).toBe(2);
    });

    it('should skip undefined sources', () => {
        const result = merge({ a: 1 }, undefined, { b: 2 });
        expect(result.a).toBe(1);
        expect(result.b).toBe(2);
    });

    it('should mutate and return the target object', () => {
        const target: Record<string, any> = { x: 1 };
        const result = merge(target, { y: 2 });
        expect(result).toBe(target);
        expect(target['y']).toBe(2);
    });

    it('should handle no extra sources', () => {
        const result = merge({ a: 1 });
        expect(result).toEqual({ a: 1 });
    });

    it('should handle null/falsy target by defaulting to empty object', () => {
        const result = merge(null as any, { a: 1 });
        expect(result.a).toBe(1);
    });

    it('should add new keys from source', () => {
        const result = merge({} as any, { a: 1, b: 2 });
        expect(result.a).toBe(1);
        expect(result.b).toBe(2);
    });
});
