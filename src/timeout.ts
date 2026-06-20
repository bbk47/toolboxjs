export function timeoutPromise(time: number): Promise<string> {
    return new Promise((resolve) => setTimeout(() => resolve('timeout:' + time), time));
}
