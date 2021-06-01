const { join, resolve } = require('path');
const glob = require('fast-glob');
const compose = require('koa-compose');
const serve = require('./serve.js');
const Endpoint = require('./endpoint.js');

const namePrefixRx = /^[a-zA-Z_-]+\:\//;

class Router {
    constructor(prefix, methods) {
        this._methods = methods === false ? [] : methods || Router.methods;
        this._byNames = {};
        this._byPatterns = {};
        this._endpoints = [];
        this._fallback = [];
        this._prefix = '/';
        this._testPrefix = null;
        this._filters = [];
        if (typeof prefix === 'string') {
            if (prefix[0] !== '/') {
                prefix = '/'+prefix;
            }
            this._prefix = prefix;
            if (prefix.endsWith('/')) { // only children
                this._testPrefix = path => path.startsWith(prefix);
            } else {
                const prefixSlash = prefix+'/';
                this._testPrefix = path => path.startsWith(prefixSlash) || path === prefix;
            }
        }
        this._methods.forEach(method => {
            this[method] = (name, pattern, target) => {
                if (!target) {
                    target = pattern;
                    pattern = name;
                    name = null;
                }
                const crud = {};
                crud[method] = target;
                this.use(name, pattern, crud);
                return this;
            }
        })
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
        this._filters.push(serve(root, opts));
        return this;
    }

    filter() {
        var ar = Array.from(arguments).flat();
        this._filters.push.apply(this._filters, ar);
        return this;
    }

    fallback() {
        var ar = Array.from(arguments).flat();
        this._fallback.push.apply(this._fallback, ar);
        return this;
    }

    url(name, params, opts) {
        const endpoint = this._byNames[name];
        return endpoint ? endpoint.makePath(params, opts) : null;
    }

    /**
     * Create a sub-router and mount it under the given prefix
     * @param {*} prefix
     * @returns
     */
    mount(prefix) {
        const router = new Router(prefix, this._methods);
        router.app = this.app;
        router.parent = this;
        // the sub-touter dispatch fn will be lazily computed
        // since the router is not yet configured
        let nestedDispatchFn;
        // use a custom endpoint
        this._endpoints.push({
            router: router,
            pattern: router._prefix,
            match: router._testPrefix,
            // we should create the dispatch fn on demand since
            // the sub router is not yet configured
            dispatch: (ctx, next) => {
                if (!nestedDispatchFn) {
                    nestedDispatchFn = router.createDispatchFn();
                }
                return nestedDispatchFn(ctx, next);
            }
        });
        return router;
    }

    /**
     * The name is optional if you pass only 2 arguments then the name will not be set.
     * Child routers must define a prefix other than '/'.
     * @param {*} name
     * @param {*} pattern
     * @param {*} target
     * @returns
     */
    use(name, pattern, target) {
        if (!target) {
            target = pattern;
            pattern = name;
            name = null;
        }
        return this._addEndpoint(name, pattern, target);
    }

    _createEndpoint(name, pattern, target) {
        const endpoint = new Endpoint(join(this._prefix, pattern), name);
        const type = typeof target;
        if (type === 'string') {
            // a redirect
            endpoint.dispatch = (ctx, next) => {
                ctx.redirect(target);
                ctx.status = 301;
                return next();
            }
        } else if (type === 'function') {
            // replace the default didpatch
            endpoint.dispatch = target;
        } else if (type == 'object') {
            // a crud object
            Object.assign(endpoint, target);
        } else if (Array.isArray(target)) {
            // expecting an array of functions
            endpoint.dispatch = compose(target);
        }
        return endpoint;
    }

    _registerEndpoint(endpoint) {
        this._endpoints.push(endpoint);
        this._byPatterns[endpoint.pattern] = endpoint;
        if (endpoint.name) {
            this._byNames[endpoint.name] = endpoint;
        }
        return endpoint;
    }

    _addEndpoint(name, pattern, target) {
        let endpoint = this._byPatterns[pattern];
        if (!endpoint) {
            this._registerEndpoint(this._createEndpoint(name, pattern, target));
        } else if (typeof target === 'object') {
            // check if the new target is overwriting existing bindings
            Object.keys(target).forEach(method => {
                if (method in endpoint) {
                    throw new Error('Method "'+method+'" already defined for endpoint: '+pattern);
                }
            });
            Object.assign(endpoint, target); // update the endpoint
        } else {
            throw new Error('Endpoint already defined: '+pattern);
        }
        return this;
    }

    _newEndpoint(file, ResourceEndpoint) {
        try {
            return new ResourceEndpoint(this.app || this);
        } catch(e) {
            console.error('Failed to load endpoint "'+file+'":', e.message);
            console.error('Not exporting an Endpoint class?');
            throw e;
        }
    }

    getEndpointByName(name) {
        return this._byNames[name];
    }

    getEndpointByPattern(pattern) {
        return this._byPatterns[name];
    }

    getEndpoints() {
        return this._endpoints;
    }

    load(mapping) {
        const type = typeof mapping;
        if (type === 'object') {
            Object.keys(mapping).forEach(pattern => {
                let name = null;
                let i = pattern.indexOf(':/');
                if (i > -1 && namePrefixRx.test(pattern)) {
                    name = pattern.substring(0, i);
                    pattern = pattern.substring(i+1);
                }
                this._addEndpoint(name, pattern, mapping[pattern]);
            });
        } else {
            let patterns;
            if (type === 'string') {
                patterns = Array.from(arguments);
            } else if (Array.isArray(mapping)) {
                patterns = mapping;
            }
            const files = glob.sync(patterns);
            files.forEach(file => {
                const ResourceEndpoint = require(resolve(file));
                const endpoint = this._newEndpoint(file, ResourceEndpoint);
                if (endpoint.pattern === '/') { // when binding an endpoint into / inside a (child) reouter
                    endpoint.pattern = this._prefix;
                } else {
                    endpoint.pattern = join(this._prefix, endpoint.pattern);
                }
                if (this._byPatterns[endpoint.pattern]) {
                    throw new Error('Endpoint for "'+endpoint.pattern+'" already defined');
                }
                this._registerEndpoint(endpoint);
            })
        }
        return this;
    }

    createDispatchFn() {
        const fns = this._filters.slice();
        // add the endpoint middleware
        const serveEndpoint = (ctx, next) => {
            const path = ctx.path;
            let found, match;
            for (const endpoint of this._endpoints) {
                const m = endpoint.match(path);
                if (m) {
                    found = endpoint;
                    match = m;
                    break;
                }
            }
            if (found) {
                ctx.params = match.params;
                ctx._routesEndpoint = found;
                return found.dispatch(ctx, next);
            } else {
                return next();
            }
        }
        fns.push(serveEndpoint);
        if (this._fallback.length > 0) {
            // add the fallback middleware
            const fallbackFn = this._fallback.length > 1 ? compose(this._fallback) : this._fallback[0];
            const serveFallback = (ctx, next) => {
                if (!ctx._routesEndpoint) { // no routes matched
                    return fallbackFn(ctx, next);
                } else {
                    return next();
                }
            }
            fns.push(serveFallback);
        }
        return compose(fns);
    }

    routes() {
        const dispatchFn = this.createDispatchFn();
        return (ctx, next) => {
            return !this._testPrefix || this._testPrefix(ctx.path) ?
                dispatchFn(ctx, next)
                : next();
        }
    }

}
// you can modify this array to remove or add extra methods
Router.methods = ['get', 'head', 'options', 'post', 'put', 'delete', 'patch'];

module.exports = Router;
