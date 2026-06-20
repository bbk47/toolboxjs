export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'log' | 'debug';

export interface Logger {
    fatal: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
    info: (msg: string) => void;
    log: (msg: string) => void;
    debug: (msg: string) => void;
}

interface LevelConfig {
    piv: number;
    colour: string;
}

const levelVal: Record<LogLevel, LevelConfig> = {
    fatal: { piv: 1, colour: '\x1b[31m%s\x1b[0m' },
    error: { piv: 2, colour: '\x1b[31m%s\x1b[0m' },
    warn: { piv: 3, colour: '\x1b[33m%s\x1b[0m' },
    info: { piv: 4, colour: '\x1b[32m%s\x1b[0m' },
    log: { piv: 5, colour: '\x1b[37m%s\x1b[0m' },
    debug: { piv: 6, colour: '\x1b[35m%s\x1b[0m' },
};

function formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function getCustomLogger(
    label: string,
    level: LogLevel,
    _logFile?: string
): Logger {
    const noop = () => undefined;
    const setPiv = levelVal[level].piv;

    function makeLogFn(key: LogLevel): (msg: string) => void {
        if (levelVal[key].piv <= setPiv) {
            const colour = levelVal[key].colour;
            return (msg: string) => {
                const date = formatDate(new Date());
                const prefix = `${date} [${key[0].toUpperCase()}] ${label} `;
                console.log(colour, prefix, msg);
            };
        }
        return noop;
    }

    return {
        fatal: makeLogFn('fatal'),
        error: makeLogFn('error'),
        warn: makeLogFn('warn'),
        info: makeLogFn('info'),
        log: makeLogFn('log'),
        debug: makeLogFn('debug'),
    };
}
