const timeoutPromise = (time) => new Promise((resolve) => setTimeout(() => resolve('timeout:' + time), time));

exports.timeoutPromise = timeoutPromise;
