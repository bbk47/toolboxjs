import uuid from '../src/uuid';

const UUID_REGEX = /^[0-9a-f]{32}$/;
const UUID_WITH_DASH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuid', () => {
    it('should return a 32-character hex string (no dashes)', () => {
        const id = uuid();
        expect(UUID_REGEX.test(id)).toBe(true);
    });

    it('should return a string of length 32', () => {
        expect(uuid()).toHaveLength(32);
    });

    it('should generate unique values on each call', () => {
        const ids = new Set(Array.from({ length: 100 }, () => uuid()));
        expect(ids.size).toBe(100);
    });

    it('should only contain lowercase hex characters', () => {
        const id = uuid();
        expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });
});
