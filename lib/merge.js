function merge(target) {
    target = target || {};
    var args = [].slice.call(arguments, 1);
    args.forEach((temp) => {
        if (temp) {
            Object.keys(temp).forEach((key) => {
                if (temp[key]) {
                    target[key] = temp[key];
                }
            });
        }
    });
    return target;
}

module.exports = merge;

// console.log(merge({}, { sss: 123 }, { bb: 456 },{sss:null}));
