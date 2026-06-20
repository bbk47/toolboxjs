export interface Deferred<T = any> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}

export default function deferred<T = any>(): Deferred<T> {
    const defer = {} as Deferred<T>;
    defer.promise = new Promise<T>((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
    });
    return defer;
}
