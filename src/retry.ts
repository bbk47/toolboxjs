const delay = (time: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, time));

export interface RetryOptions {
    times?: number;
    interval?: number;
}

export default function retryPromise<T>(
    fn: () => Promise<T>,
    opts: RetryOptions = {},
    errcall?: (err: Error) => void
): Promise<T> {
    const retryCount = opts.times !== undefined ? opts.times : 5;

    function invoker(idx: number): Promise<T> {
        if (idx >= retryCount) {
            return Promise.reject(
                new Error(`expect retryCount ${retryCount} is attached!`)
            );
        }
        return fn().catch((err: Error) => {
            errcall && errcall(err);
            if (opts.interval) {
                return delay(opts.interval).then(() => invoker(idx + 1));
            } else {
                return invoker(idx + 1);
            }
        });
    }
    return invoker(0);
}
