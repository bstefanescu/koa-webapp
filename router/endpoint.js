const { match, compile } = require('path-to-regexp');
const createMatcher = require('./matchers.js');

function lcMethod(ctx) {
    let method = ctx._routesMethod;
    if (!method) {
        ctx._routesMethod = method = ctx.request.method.toLowerCase();
    }
    return method;
}

function decode(val) {
    return val ? decodeURIComponent(val) : val;
}


class Endpoint {
    /**
     * The endpoint class defines an object which is bound to a path pattern and provide a dispatch method to consume the request
     * You can use it as a base class to create custom endpoints.
     * Custom endpoints are instantiated by the router by passing the router instance as an argument.
     * Also custom endpoints will have a 'services' property which is pointing to the Router instance 'services' property.
     * You can thus easily access exposed top level services inside endpoints.
     *
     * ```
     * class UserResource extends Endpoint {
     *   constructor() {
     *     super('users/:userId', 'user');
     *   }
     *
     *   get(ctx, next) {
     *      ctx.body = 'Hello!';
     *      return next();
     *   }
     * }
     *
     * or
     *
     * class UserResource extends Endpoint {
     *   constructor() {
     *     super('users/:userId'); // the endpoint name will be 'UserResource'
     *   }
     *
     *   get(ctx, next) {
     *      ctx.body = 'Hello!';
     *      return next();
     *   }
     * }
     *
     * @param {string} pattern  - the endpoint pattern
     * @param {string} name - optional - the endpoint name if not specified it will use the class name for custom endpoints
     */
    constructor(pattern, name) {
        if (!pattern) throw new Error('Invalid endpoint ctor arguments: you need to specify at least the pattern')
        if (name) {
            this.name = name;
        } else {
            this.name = this.constructor !== Endpoint ? this.constructor.name : null;
        }
        this.pattern = pattern;

        this._matcher = null; // create matcher lazily to let the router a chance to update the pattern in case a prefix is defined
        this._makePath = null; // same for this one
    }

    get makePath() {
        if (!this._makePath) {
            this._makePath = compile(this.pattern);
        }
        return this._makePath;
    }

    match(path) {
        if (!this._matcher) {
            if (this.pattern.indexOf(':') < 0 && this.pattern.indexOf('(') < 0) {
                // static, prefix or suffix pattern
                this._matcher = createMatcher(this.pattern);
            } else { // a variable / regex pattern
                this._matcher = match(this.pattern, { decode: decode });
            }
        }
        return this._matcher(path);
    }

    all(ctx, next) {
        // do nothing by default
        return next();
    }

    dispatch(ctx, next) {
        const methodFn = this[lcMethod(ctx)];
        if (methodFn) {
            return methodFn.call(this, ctx, next)
        } else {
            return this.all(ctx, next);
        }
    }
}

module.exports = Endpoint;
