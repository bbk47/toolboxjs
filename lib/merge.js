function factory(overide) {
    return function assign(target) {
        target = target || {};
        var args = [].slice.call(arguments, 1);
        args.forEach((temp) => {
            if (temp) {
                Object.keys(temp).forEach((key) => {
                    if (overide) {
                        target[key] = temp[key];
                    } else if (temp[key]) {
                        target[key] = temp[key];
                    }
                });
            }
        });
        return target;
    };
}

function merge(target) {
    return factory(false).apply(target, arguments);
}

function assign(target) {
    return factory(true).apply(target, arguments);
}

exports.objectMerge = merge;
exports.objectAssign = assign;
