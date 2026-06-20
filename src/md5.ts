import crypto from 'crypto';

export default function md5(s: string | number): string {
    return crypto.createHash('md5').update(String(s)).digest('hex');
}
