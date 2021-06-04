const crypto = require('crypto');
const path = require('path');
const Koa = require('koa');
const AuthService = require('./auth');
const Router = require('./router');
const errorHandler = require('./error')
const Resource = require('./router/resource');
const Body = require('./body');

function createOptions(opts) {
    opts = Object.assign({
        prefix: '/',
        apiPrefix: '/api/v1',
        noFoundMessage: 'Resource not found',
        proxy: false,
        auth:{},
        serve:{},
        body: {},
        error:{}
    }, opts || {});
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
     *   apiPrefix: '/api/v1',
     *   apiRoot: RootResourceClass,
     *   noFoundMessage: '',
     *   error: false | object, if explicitly set to false - no custom error handler is set
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
        if (!this.apiRoot) { // you can use a getter in the extending class
            this.apiRoot = this.opts.apiRoot;
        }
        this.apiPrefix = this.opts.apiPrefix;
        if (this.findUser) {
            this.opts.auth.findUser = this.findUser.bind(this);
        }
        this.koa = new Koa(this.opts);
        this.koa.webapp = this;
        this.koa.proxy = !!this.opts.proxy;
        this.router = new Router(this.opts.prefix || '/');
        this.router.app = this;
        this.router.notFoundMessage = this.opts.notFoundMessage;
        this.auth = new AuthService(this.opts.auth);
        if (this.opts.error !== false) {
            this.koa.context.onerror = this.errorHandler
                ? this.errorHandler.bind(this)
                : errorHandler(this.opts.error);
        }
        Body.install(this.koa);
        this.setup();
        // add routes
        this.koa.use(this.router.middleware());
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
        const authRouter = router.mount(prefix);
        authRouter.post('/login', auth.koa.loginMiddleware());
        authRouter.post('/logout', auth.koa.logoutMiddleware());
        authRouter.post('/token', auth.koa.tokenMiddleware());
        authRouter.post('/refresh', auth.koa.refreshMiddleware());
    }


    setupApiFilters(apiRouter, auth) {
        apiRouter.use(auth.koa.authMiddleware());
    }

    setupApiRoutes(router) {
        if (this.apiRoot) {
            const apiRouter = router.mount(this.apiPrefix);
            this.setupApiFilters(apiRouter, this.auth);
            apiRouter.use('/', this.apiRoot);
        }
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
        return this.koa.listen(port, () => {
            if (cb) {
                if (cb(this) === false) return; // quiet mode
            }
            console.log(`App listening on port ${port}\nPress Ctrl+C to quit.`);
        })
    }
}

WebApp.Resource = Resource;
module.exports = WebApp;