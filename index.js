const crypto = require('crypto');
const path = require('path');
const callsites = require('callsites');
const Koa = require('koa');
const AuthService = require('./auth');
const Router = require('./router');
const errorHandler = require('./error')
const Endpoint = require('./router/endpoint');
const Body = require('./body');
const PORT = process.env.PORT || 8080;

/**
 * Get the file defining the class extending the WebApp which is actually instantiated
 * Returns null if not found or the WebApp class is directly instatiated
 * This function must be used in the constructor.
 */
function getWebappInstanceFile(callsites) {
    let file;
    for (callsite of callsites) {
        if (callsite.isConstructor()) {
            file = callsite.getFileName();
        } else {
            break;
        }
    }
    return file && file !== __filename ? file : null;
}

/**
 * Create a file resolver depending on how the WebApp was instantiated.
 * If the WebApp class which is instantiated is a custom class (extending the WebApp class)
 * then it return a file resolver which resolve files realtive to the file containing the derived class definition
 * otherwise if creates a file resolver using process.cwd() as the base directory.
 * This function must be used in the constructor.
 */
function createFileResolver(callsites) {
    const file = getWebappInstanceFile(callsites);
    const dir = file ? path.dirname(file) : process.cwd();
    return (filePath) => path.resolve(dir, filePath);
}

function createOptions(opts) {
    opts = Object.assign({
        prefix: '/',
        noFoundMessage: 'Resource not found',
        proxy: false,
        api:{},
        auth:{},
        serve:{},
        body: {},
        error:{}
    }, opts || {});
    opts.api = Object.assign({
        files: 'api/**.js',
        prefix: '/api/v1'
    }, opts.api);
    opts.auth = Object.assign({
        prefix: '/auth'
    }, opts.auth);
    opts.serve = Object.assign({
        root: 'web',
        prefix: '/',
        exclude: ['/api/*', '/auth/*']
    }, opts.serve);

    if (!opts.auth.secret || !opts.auth.secret.length) {
        // generate a secret
        opts.auth.secret = [ crypto.randomBytes(48).toString('hex') ];
    }
    return opts;
}

class WebApp {
    /**
     * opts: {
     *   proxy, // .. and other koa props
     *   prefix: '/',
     *   noFoundMessage: '',
     *   error: false | object, if explicitly set to false - no custom error handler is set
     *   api: {
     *     files: 'api/**.js',
     *     prefix: '/api/v1'
     *   },
     *   auth: {
     *      prefix: '/auth',
     *      ... auth options ...
     *   },
     *   serve: {
     *      root: 'web',
     *      prefix: '/',
     *      exclude: ['/api/*', '/auth/*']
     *   }
     * }
     * @param {object} opts
     */
    constructor(opts = {}) {
        this.opts = createOptions(opts);
        this.resolveFile = createFileResolver(callsites());
        this.koa = new Koa(this.opts);
        this.koa.proxy = !!this.opts.proxy;
        this.router = new Router(this.opts.prefix || '/');
        this.router.app = this;
        this.auth = new AuthService(Object.assign({
            findUser: this.findUser.bind(this)
        }, this.opts.auth));
        if (this.opts.error !== false) {
            this.koa.context.onerror = this.errorHandler
                ? this.errorHandler.bind(this)
                : errorHandler(this.opts.error);
        }
        Body.install(this.koa);
        this.setup();
        // throw a 404 error if no routes matches
        // to force the custom error handler to be used to format the 404 error
        if (this.opts.error !== false) {
            this.router.fallback(ctx => {
                ctx.throw(404, opts.notFoundMessage);
            });
        }
        // add routes
        this.koa.use(this.router.routes());
    }

    findUser(nameOrEmail) {
        throw new Error('findUser(nameOrEmail) not implemented');
    }

    /**
     * Setup global filterd that are always called
     * @param {*} router
     */
    setupFilters(router) {
        // nothing to do by default
    }

    setupStaticResources(router) {
        const serveOpts = this.opts.serve;
        router.serve(serveOpts.root, serveOpts);
    }

    /**
     * Setup main routes including login / logout endpoints.
     * To be redefined by subclasses if needed
     * @param {*} router
     * @param {*} auth
     */
    setupRoutes(router, auth) {
        const prefix = this.opts.auth.prefix || '/auth';
        router.post(path.join(prefix, 'login'), auth.koa.loginMiddleware());
        router.post(path.join(prefix, 'logout'), auth.koa.logoutMiddleware());
        router.post(path.join(prefix, 'token'), auth.koa.tokenMiddleware());
        router.post(path.join(prefix, 'refresh'), auth.koa.refreshMiddleware());
    }


    setupApiFilters(apiRouter, auth) {
        apiRouter.filter(auth.koa.authMiddleware());
    }

    setupApiRoutes(router) {
        const apiRouter = router.mount(this.opts.api.prefix);
        this.setupApiFilters(apiRouter, this.auth);
        apiRouter.load(this.resolveFile(this.opts.api.files));
    }

    /**
     * use this to setup koa and your routes
     * @param {*} router
     * @param {*} auth
     */
    setup() {
        const router = this.router;
        const auth = this.auth;
        // global filters that are always called
        this.setupFilters(router);
        // serve static resources
        this.setupStaticResources(router);
        // auth endpoints
        this.setupRoutes(router, auth);
        // api router
        this.setupApiRoutes(router);
    }

    callback() {
        return this.koa.callback();
    }

    listen(port, cb) {
        if(!port) {
            port = PORT;
        } else if(typeof port === 'function') {
            cb = port;
            port = PORT;
        }
        this.koa.listen(port, () => {
            if (cb) {
                if (cb(this) === false) return; // quiet mode
            }
            console.log(`App listening on port ${port}`);
            console.log('Press Ctrl+C to quit.');
        })
    }
}

WebApp.Endpoint = Endpoint;
module.exports = WebApp;