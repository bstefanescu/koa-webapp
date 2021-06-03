const { join, resolve } = require('path');
const { createMatcher } = require('./matchers.js');
const compose = require('koa-compose');
const serve = require('./serve.js');
const Resource = require('./resource.js');

const pathWildcardRx = /[\+\*\:\(]/;

function matchMethodMiddleware(middleware, method) {
    if (!method) return middleware;
    return (ctx, next) => {
        if (ctx.method === method) {
            return middleware.call(this, ctx, next);
        } else {
            return next();
        }
    }
}

function matchPathMiddleware(middleware, pattern) {
    if (!pattern) return middleware;
    const match = createMatcher(pattern);
    return (ctx, next) => {
        if (match(ctx.path)) {
            return middleware.call(this, ctx, next);
        } else {
            return next();
        }
    }
}

function matchContextMiddleware(middleware, method, pattern) {
    if (!pattern && !method) return middleware;
    if (method) {
        middleware = matchMethodMiddleware(middleware, method);
    }
    if (pattern) {
        middleware = matchPathMiddleware(middleware, pattern);
    }
    return middleware;
}

function normalizePrefix(prefix) {
    if (!prefix || prefix === '/') return '/';
    if (pathWildcardRx.test(prefix)) {
        throw new Error('Router mount point must not contain wildcard or regexp expressions. Got: '+prefix);
    }
    return prefix[0] !== '/' ? '/'+prefix : prefix;
}

class Router {
    constructor(prefix, methods) {
        this._methods = methods;
        this._prefix = normalizePrefix(prefix);
        this._methods = methods === false ? [] : methods || Router.methods;
        this._chain = [];
        this.notFoundMessage = null;
        this.app = null;
        if (methods) {
            this.methods(methods);
        }
    }

    methods(methods) {
        function createMethod(thisObj, method) {
            return (pattern, target) => {
                return thisObj._httpMethod(method, pattern, target);
            }
        }
        for (const m of methods) {
            this[m.toLowerCase()] = createMethod(this, m.toUpperCase());
        }
        return this;
    }

    middleware() {
        // add a 404 catch all route at the end
        this._chain.push((ctx, next) => {
            ctx.throw(404, this.notFoundMessage);
        });
        const chainFn = compose(this._chain);
        if (this._prefix === '/') {
            return chainFn;
        } else {
            const pattern = join(this._prefix, this._prefix.endsWith('/') ? '/+' : '/*');
            return matchPathMiddleware(chainFn, pattern);
        }
    }

    /**
     * Use koa-send to serve static files. The serve middleware will be inserted as a filter.
     * If a request matches a static resource route it will stop the middleware chain and it will either send the file if one is found, either returns a 404.
     * It means that filters after the `serve` filter will no more be called (neither endpoints middleware)
     * If the given root is not absolute it will be resolved against the current working directory.
     * Apart the koa-send options you can use the following options:
     * 1. prefix - default to /. If defined it will only match request paths under this prefix and will exclude the prefix part from the path when matching files in the root directory.
     * 2. excludes - an array of paths to exclude. You can use wildcards to specify entire subtrees. Example:
     *      - `/api/*` will exclude '/api' and all the paths starting with /api/
     *      - `/api/+` will exclude all the paths starting with /api/. '/api' itself won't be excluded.
     * @param {*} root - the root directory to serve from. Default
     * @param {*} opts - options containing koa-send options and local options
     */
    serve(root, opts = {}) {
        this._chain.push(serve(root, opts));
        return this;
    }


    mount(prefix) {
        const router = new Router(join(this._prefix, prefix), this._methods);
        router.app = this.app;
        router.parent = this;

        let middleware;
        this._chain.push((ctx, next) => {
            if (!middleware) {
                // routes are lazily built to be sure all routes were added to the router.
                middleware = router.middleware();
            }
            return middleware(ctx, next);
        });

        return router;
    }

    use(/*method, pattern, target*/) {
        let method, pattern, target;
        if (arguments.length === 1) {
            target = arguments[0];
        } else if (arguments.length === 2) {
            pattern = arguments[0];
            target = arguments[1];
        } else if (arguments.length === 3) {
            method = arguments[0];
            pattern = arguments[1];
            target = arguments[2];
        } else {
            throw new Error('Expecting at 1, 2 or 3 arguments');
        }
        if (pattern) {
            // add the current router prefix to the pattern
            pattern = join(this._prefix, pattern);
        }
        const type = typeof target;
        if (target.prototype instanceof Resource) {
            // add a resource
            if (!pattern) throw new Error('A resource route requires a pattern');
            if (method)  throw new Error('A resource route cannot be filtered using an HTTP method');
            const rs = new target();
            rs._init(this.app, pattern);
            this._chain.push(Resource.middleware(rs));
        } else if (type === 'string') {
            // add a redirect
            if (!pattern) throw new Error('A redirect route requires a pattern');
            this._chain.push(matchContextMiddleware((ctx, next) => {
                ctx.redirect(target);
                ctx.status = 301;
            }, method, pattern));
        } else if (type) {
            // add a middleware
            this._chain.push(matchContextMiddleware(target, method, pattern));
        } else {
            throw new Error('Unsupported target');
        }
        return this;
    }

    get(pattern, target) {
        return this.use('GET', pattern, target);
    }
    put(pattern, target) {
        return this.use('PUT', pattern, target);
    }
    del(pattern, target) {
        return this.use('DELETE', pattern, target);
    }
    post(pattern, target) {
        return this.use('POST', pattern, target);
    }
    head(pattern, target) {
        return this.use('HEAD', pattern, target);
    }
    options(pattern, target) {
        return this.use('OPTIONS', pattern, target);
    }
    patch(pattern, target) {
        return this.use('PATCH', pattern, target);
    }
}

module.exports = Router;
