import md5 from '../src/md5';

describe('md5', () => {
    it('should hash string correctly', () => {
        expect(md5('admin')).toBe('21232f297a57a5a743894a0e4a801fc3');
    });

    it('should hash empty string', () => {
        expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });

    it('should hash numbers by converting to string', () => {
        expect(md5(123)).toBe(md5('123'));
    });

    it('should return lowercase hex string of length 32', () => {
        const result = md5('hello');
        expect(result).toHaveLength(32);
        expect(/^[0-9a-f]{32}$/.test(result)).toBe(true);
    });

    it('should produce different hashes for different inputs', () => {
        expect(md5('foo')).not.toBe(md5('bar'));
    });
});
