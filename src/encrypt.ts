import crypto from 'crypto';

type CipherKey = string;
interface KeyIVCache {
    [key: string]: [Buffer, Buffer];
}
interface KeyIV {
    key: Buffer;
    iv: Buffer;
}

const bytes_to_key_results: KeyIVCache = {};

const EVP_BytesToKey = function (
    password: Buffer,
    key_len: number,
    iv_len: number
): [Buffer, Buffer] {
    const cacheKey = `${password}:${key_len}:${iv_len}`;
    if (bytes_to_key_results[cacheKey]) {
        return bytes_to_key_results[cacheKey];
    }
    const m: Buffer[] = [];
    let i = 0;
    let count = 0;
    while (count < key_len + iv_len) {
        const md5hash = crypto.createHash('md5');
        let data: Buffer = password;
        if (i > 0) {
            data = Buffer.concat([m[i - 1], password]);
        }
        md5hash.update(data);
        const d = md5hash.digest();
        m.push(d);
        count += d.length;
        i += 1;
    }
    const ms = Buffer.concat(m);
    const key = ms.slice(0, key_len);
    const iv = ms.slice(key_len, key_len + iv_len);
    bytes_to_key_results[cacheKey] = [key, iv];
    return [key, iv];
};

export type CipherMethod =
    | 'aes-128-cfb'
    | 'aes-192-cfb'
    | 'aes-256-cfb'
    | 'aes-128-ctr'
    | 'aes-192-ctr'
    | 'aes-256-ctr';

const method_supported: Record<CipherMethod, [number, number]> = {
    'aes-128-cfb': [16, 16],
    'aes-192-cfb': [24, 16],
    'aes-256-cfb': [32, 16],
    'aes-128-ctr': [16, 16],
    'aes-192-ctr': [24, 16],
    'aes-256-ctr': [32, 16],
};

export class Encryptor {
    key: CipherKey;
    method: CipherMethod;
    _EVP_KEY: Buffer;
    _IV: Buffer;

    constructor(key: string = 'MVP123', method: CipherMethod = 'aes-128-cfb') {
        this.key = key;
        this.method = method;
        if (!method_supported[this.method]) {
            throw new Error('Not support method!');
        }
        const keyIV = this.getKeyIV(key, method);
        this._EVP_KEY = keyIV.key;
        this._IV = keyIV.iv;
    }

    get_cipher_len(method: string): [number, number] {
        const m = method.toLowerCase() as CipherMethod;
        return method_supported[m];
    }

    getKeyIV(password: string, method: string): KeyIV {
        const m = method.toLowerCase() as CipherMethod;
        const passwordBuf = Buffer.from(password, 'ascii');
        const [keyLen, ivLen] = this.get_cipher_len(m);
        const ref = EVP_BytesToKey(passwordBuf, keyLen, ivLen);
        return { key: ref[0], iv: ref[1] };
    }

    encrypt(buf: Buffer): Buffer {
        const cipher = crypto.createCipheriv(this.method, this._EVP_KEY, this._IV);
        const encrypted = cipher.update(buf);
        const result = cipher.final();
        return Buffer.concat([encrypted, result]);
    }

    decrypt(buf: Buffer): Buffer {
        const decipher = crypto.createDecipheriv(this.method, this._EVP_KEY, this._IV);
        const decrypted = decipher.update(buf);
        const result = decipher.final();
        return Buffer.concat([decrypted, result]);
    }
}
