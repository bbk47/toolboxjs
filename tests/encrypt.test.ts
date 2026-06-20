import { Encryptor } from '../src/encrypt';

describe('Encryptor', () => {
    it('should encrypt and decrypt correctly with aes-256-cfb', () => {
        const enc = new Encryptor('csii2019', 'aes-256-cfb');

        const r1 = enc.encrypt(Buffer.from('hello,world'));
        const r2 = enc.encrypt(Buffer.from('818c9ba2109b4c505155aebf6d3647a3'));
        const r3 = enc.encrypt(Buffer.from('818c9ba2109b4c505155aebf6d3647a2'));

        expect(enc.decrypt(r1).toString()).toBe('hello,world');
        expect(enc.decrypt(r2).toString()).toBe('818c9ba2109b4c505155aebf6d3647a3');
        expect(enc.decrypt(r3).toString()).toBe('818c9ba2109b4c505155aebf6d3647a2');
    });

    it('should use default key and method when none provided', () => {
        const enc = new Encryptor();
        const plain = Buffer.from('test data');
        const encrypted = enc.encrypt(plain);
        expect(enc.decrypt(encrypted).toString()).toBe('test data');
    });

    it('should throw when using unsupported method', () => {
        expect(() => new Encryptor('key', 'aes-999-xyz' as any)).toThrow('Not support method!');
    });

    it('should work with aes-128-cfb', () => {
        const enc = new Encryptor('mypassword', 'aes-128-cfb');
        const plain = Buffer.from('hello');
        expect(enc.decrypt(enc.encrypt(plain)).toString()).toBe('hello');
    });

    it('should work with aes-192-cfb', () => {
        const enc = new Encryptor('mypassword', 'aes-192-cfb');
        const plain = Buffer.from('testdata');
        expect(enc.decrypt(enc.encrypt(plain)).toString()).toBe('testdata');
    });

    it('should cache EVP_BytesToKey results', () => {
        const enc1 = new Encryptor('samekey', 'aes-256-cfb');
        const enc2 = new Encryptor('samekey', 'aes-256-cfb');
        const plain = Buffer.from('cached');
        expect(enc2.decrypt(enc1.encrypt(plain)).toString()).toBe('cached');
    });

    it('should return correct cipher lengths', () => {
        const enc = new Encryptor('key', 'aes-128-cfb');
        const [keyLen, ivLen] = enc.get_cipher_len('aes-128-cfb');
        expect(keyLen).toBe(16);
        expect(ivLen).toBe(16);
    });

    it('should produce different encrypted output for different keys', () => {
        const enc1 = new Encryptor('key1', 'aes-256-cfb');
        const enc2 = new Encryptor('key2', 'aes-256-cfb');
        const plain = Buffer.from('same text');
        expect(enc1.encrypt(plain).toString('hex')).not.toBe(enc2.encrypt(plain).toString('hex'));
    });
});
