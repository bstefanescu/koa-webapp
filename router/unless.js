//TODO use matchers or remove it

function methodCondition(method) {
    return ctx => ctx.request.method === method;
}

function pathCondition(path) {
    return ctx => ctx.path === path;
}

function prefixCondition(prefix) {
    return ctx => ctx.path.startsWith(prefix);
}

function suffixCondition(suffix) {
    return ctx => ctx.path.endsWith(suffix);
}

function unless(opts) {
    const origMiddleware = this;
    let matches;
    if (typeof opts == 'function') {
        matches = opts;
    } else {
        let fns = [];
        if (opts.method) {
            if (Array.isArray(opts.method)) {
                for (const val of opts.method)
                fns.push(methodCondition(val));
            } else {
                fns.push(methodCondition(opts.method));
            }
        }
        if (opts.path) {
            if (Array.isArray(opts.path)) {
                for (const val of opts.path)
                fns.push(pathCondition(val));
            } else {
                fns.push(pathCondition(opts.path));
            }
        }
        if (opts.prefix) {
            if (Array.isArray(opts.prefix)) {
                for (const val of opts.prefix)
                fns.push(prefixCondition(val));
            } else {
                fns.push(prefixCondition(opts.prefix));
            }
        }
        if (opts.suffix) {
            if (Array.isArray(opts.suffix)) {
                for (const val of opts.suffix)
                fns.push(suffixCondition(val));
            } else {
                fns.push(suffixCondition(opts.suffix));
            }
        }
        matches = ctx => {
            for (const fn of fns) {
                if (fn(ctx)) return true;
            }
            return false;
        }
    }
    return (ctx, next) => {
        if (matches(ctx)) {
            return next();
        } else {
            return origMiddleware.call(this, ctx, next)
        }
    }
}

module.exports = unless;