import getCustomLogger from '../src/logger';

describe('logger', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('should log at all levels when level is debug', () => {
        const log = getCustomLogger('TEST', 'debug');
        log.fatal('fatal msg');
        log.error('error msg');
        log.warn('warn msg');
        log.info('info msg');
        log.log('log msg');
        log.debug('debug msg');
        expect(consoleSpy).toHaveBeenCalledTimes(6);
    });

    it('should only log fatal when level is fatal', () => {
        const log = getCustomLogger('TEST', 'fatal');
        log.fatal('fatal msg');
        log.error('error msg');
        log.warn('warn msg');
        log.info('info msg');
        log.log('log msg');
        log.debug('debug msg');
        expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should log fatal and error when level is error', () => {
        const log = getCustomLogger('TEST', 'error');
        log.fatal('fatal');
        log.error('error');
        log.warn('warn');
        expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it('should not log debug when level is info', () => {
        const log = getCustomLogger('TEST', 'info');
        log.debug('debug msg');
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should include label and level prefix in output', () => {
        const log = getCustomLogger('MYAPP', 'debug');
        log.info('test message');
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining('MYAPP'),
            'test message'
        );
    });

    it('should include [I] for info level in prefix', () => {
        const log = getCustomLogger('APP', 'debug');
        log.info('msg');
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining('[I]'),
            'msg'
        );
    });

    it('should include [D] for debug level in prefix', () => {
        const log = getCustomLogger('APP', 'debug');
        log.debug('msg');
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining('[D]'),
            'msg'
        );
    });

    it('should accept optional logFile parameter', () => {
        expect(() => getCustomLogger('APP', 'info', '/tmp/test.log')).not.toThrow();
    });

    it('noop functions should not throw', () => {
        const log = getCustomLogger('TEST', 'fatal');
        expect(() => log.debug('should not throw')).not.toThrow();
        expect(() => log.info('should not throw')).not.toThrow();
    });
});
