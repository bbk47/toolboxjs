var timeoutPromise = (time) =>
    new Promise((resolve) => setTimeout(resolve, time));

function retryPromise(fn, opts = {}, errcall) {
    var retryCount = opts.times || 5;

    function invoker(idx) {
        if (idx >= retryCount) {
            return Promise.reject(
                Error(`expect retryCount ${retryCount} is attached!`)
            );
        }
        return fn.call(null).catch((err) => {
            errcall && errcall(err);
            if (opts.interval) {
                return timeoutPromise(opts.interval).then(() => invoker(idx + 1));
            } else {
                return invoker(idx + 1);
            }
        });
    }
    return invoker(0);
}

module.exports = retryPromise;