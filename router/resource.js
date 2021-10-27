const { join } = require('path');
const { createMatcher } = require('./matchers.js');


function lcMethod(ctx) {
    let method = ctx._routesMethod;
    if (!method) {
        ctx._routesMethod = method = ctx.request.method.toLowerCase();
    }
    return method;
}

class RoutesBuilder {

    constructor(resource) {
        this.resource = resource;
        this.routes = [];
    }

    use(pattern, target) {
        if (!target || !(target.prototype instanceof Resource)) {
            throw new Error('Invalid route target. Only classes extending Resource can be registered using `use`. Use `get`, `post` etc. to register methods. Got: ' + target);
        }
        const res = new target();
        res._init(this.resource.app, pattern);
        this.routes.push(res);
    }

    _httpMethod(name, pattern, target) {
        this.routes.push(new MethodResource(this.resource, name, pattern, target));
        return this;
    }

    get(pattern, target) {
        return this._httpMethod('GET', pattern, target);
    }

    post(pattern, target) {
        return this._httpMethod('POST', pattern, target);
    }

    put(pattern, target) {
        return this._httpMethod('PUT', pattern, target);
    }

    del(pattern, target) {
        return this._httpMethod('DELETE', pattern, target);
    }

    head(pattern, target) {
        return this._httpMethod('HEAD', pattern, target);
    }

    options(pattern, target) {
        return this._httpMethod('OPTIONS', pattern, target);
    }

    patch(pattern, target) {
        return this._httpMethod('PATCH', pattern, target);
    }

    methods(/*methods*/) {
        function createMethod(thisObj, method) {
            return (pattern, target) => {
                return thisObj._httpMethod(method, pattern, target);
            }
        }
        const methods = Array.from(arguments).flat();
        for (const m of methods) {
            this[m.toLowerCase()] = createMethod(this, m.toUpperCase());
        }
        return this;
    }

}


class MethodResource {

    constructor(resource, method, pattern, target) {
        const type = typeof target;
        if (type === 'string') {
            this.target = ctx => {
                ctx.redirect(target);
                ctx.status = 301;
            }
        } else if (type === 'function') {
            this.target = target;
        } else {
            throw new Error('Invalid type for method target. Only string or fucntions are supported')
        }
        this.pattern = pattern;
        this.resource = resource;
        this.method = method;
    }

    _match(path) {
        if (!this._matcher) {
            this._matcher = createMatcher(this.pattern);
        }
        return this._matcher(path);
    }

    match(ctx, path, visitors, params) {
        if (ctx.method === this.method) {
            const m = this._match(path);
            if (m) {
                if (m.params) {
                    Object.assign(params, m.params);
                }
                return this;
            }
        }
        return false;
    }

    dispatch(ctx) {
        return this.target.call(this.resource, ctx);
    }

}

class Resource {

    _init(app, pattern) {
        this.app = app;
        this._pattern = pattern;
        this._routes = null;
        if (this.setup) {
            const router = new RoutesBuilder(this);
            this.setup(router);
            if (router.routes.length > 0) {
                const lastc = pattern[pattern.length - 1];
                if (lastc === '*' || lastc === '+' || lastc === '?') {
                    throw new Error('Cannot add nested resources to resource with patterns ending in + * or ?');
                }
                if (this._pattern.indexOf(':') > -1 || this._pattern.indexOf('(') > -1) {
                    // a pattern
                    this._pattern = join(this._pattern, '/:_*');
                } else {
                    // a prefix - this is an optimization to avoid using path-to-regexp for simple cases like prefixes
                    this._pattern = join(this._pattern, '/*');
                }
                this._routes = router.routes;
            }
        }
    }

    _match(path) {
        if (!this._matcher) {
            this._matcher = createMatcher(this._pattern);
        }
        return this._matcher(path);
    }

    /**
     *
     * @param {string} path - the path to match
     * @param {array} visitors - the list of matched resources to visit
     * @param {object} params - the path params
     * @returns
     */
    match(ctx, path, visitors, params) {
        var m = this._match(path);
        if (m) {
            this.visit && visitors.push(this);
            let theRest;
            if (m === true) { // a prefix match: '/api/*'
                theRest = path.substring(this._pattern.length - 2);
                if (theRest) Object.assign(params, { '_': theRest });
            } else { // a path-to-regexp match
                theRest = m.params._;
                // path-to-regexp return an array of segments
                if (theRest) theRest = '/' + theRest.join('/');
                Object.assign(params, m.params);
            }
            if (this._routes && theRest && theRest.length) {
                for (const route of this._routes) {
                    const rs = route.match(ctx, theRest, visitors, params);
                    if (rs) {
                        return rs;
                    }
                }
                return null; // 404
            } else { // matched this resource
                return this;
            }
        }
        return false; // return false - no match
    }

    all(ctx, next) {
        ctx.throw(405); // method not allowed
    }

    dispatch(ctx, next) {
        const methodName = lcMethod(ctx);
        let methodFn = this[methodName];
        if (!methodFn && methodName === 'delete') {
            methodFn = this.del; // try 'del'
        }
        if (methodFn) {
            return methodFn.call(this, ctx, next)
        } else {
            return this.all(ctx, next);
        }
    }

    /*
    visit(ctx) {

    }
    routes(router) {
        router.use('/:userId', UserResource);
        router.get('/version', this.getVersion);
    }
    */

}

function resourceMiddleware(root) {
    return async (ctx, next) => {
        const visitors = [], params = {};
        const endpoint = root.match(ctx, ctx.path, visitors, params);
        if (endpoint) {
            ctx.params = params;
            for (const visitor of visitors) {
                visitor.visit(ctx);
            }
            return await endpoint.dispatch(ctx);
        } else if (endpoint !== false) {
            // partially matched
            ctx.throw(404);
        } else {
            return next();
        }
    }
}


Resource.middleware = resourceMiddleware;
module.exports = Resource;
