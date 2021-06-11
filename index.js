const crypto = require('crypto');
const path = require('path');
const Koa = require('koa');
const AuthService = require('./auth');
const Router = require('./router');
const errorHandler = require('./error')
const Resource = require('./router/resource');
const Body = require('./body');

class WebApp {

    constructor(opts) {
        opts = Object.assign(this.defaultOptions, opts || {});
        const koa = new Koa();
        koa.webapp = this;
        koa.proxy = !!opts.proxy;
        koa.context.onerror = errorHandler(opts.errorHandlerOptions);
        const router = new Router(opts.prefix || '/');
        router.app = this;
        router.notFoundMessage = opts.notFoundMessage;
        this.koa = koa;
        this.router = router;
        this.auth = new AuthService({
            findUser: this.findUser.bind(this),
            secret: opts.secret,
            allowAnonymous: opts.allowAnonymous,
            requestTokenHeader: opts.requestTokenHeader,
            cookie: opts.authCookie,
            jwtSignOpts: opts.jwtSignOpts,
            jwtVerifyOpts: opts.jwtVerifyOpts
        });
        Body.install(koa, opts.bodyOptions);
        this.opts = opts;
        this.setup();
        // add routes
        koa.use(this.router.middleware());
    }

    get defaultOptions() {
        return {
            prefix: '/',
            secret: [ crypto.randomBytes(48).toString('hex') ],
            notFoundMessage: 'Resource not found',
            //apiRoot: undefined,
            apiPrefix: '/api/v1',
            authPrefix: '/auth',
            servePrefix: '/',
            serveExclude: ['/api/*', '/auth/*'],
            //serveFilters: undefined,
            serveRoot: 'web',
            requestTokenHeader: 'x-koa-webapp-request-token',
            allowAnonymous: false,
            //authCookie: undefined,
            //jwtSignOpts: undefined,
            //jwtVerifyOpts: undefined,
            proxy: false,
            //bodyOptions: undefined,
            //errorHandlerOptions: undefined
        }
    }

    /**
     * Find an user object (in the user store) given a username or email
     * @param {string} nameOrEmail
     * @abstract
     */
    findUser(nameOrEmail) {
        throw new Error('findUser(nameOrEmail) not implemented');
    }

    /**
     * Setup global filterd that are always called
     * @param {*} router
     * @protected
     */
    setupFilters(router) {
        // nothing to do by default
    }

    /**
     * Setup main routes
     * @param {*} router
     * @protected
     */
    setupRoutes(router) {
        // nothing to do by default
    }

    /**
     *
     * @param {*} apiRouter
     * @param {*} auth
     * @protected
     */
    setupApiFilters(apiRouter, auth) {
        apiRouter.use(auth.koa.authMiddleware());
    }


    /**
     * use this to setup koa and your routes
     * @param {*} router
     * @param {*} auth
     * @protected
     */
    setup() {
        const router = this.router;
        const auth = this.auth;
        // global filters that are always called
        this.setupFilters(router);
        // serve static resources
        if (this.opts.serveRoot) {
            router.serve(this.opts.serveRoot, {
                prefix: this.opts.servePrefix,
                exclude: this.opts.serveExclude,
                filters: this.opts.serveFilters
            });
        }
        // auth endpoints
        if (this.opts.authPrefix) {
            const authRouter = router.mount(this.opts.authPrefix);
            authRouter.post('/login', auth.koa.loginMiddleware());
            authRouter.post('/logout', auth.koa.logoutMiddleware());
            authRouter.post('/token', auth.koa.tokenMiddleware());
            authRouter.post('/refresh', auth.koa.refreshMiddleware());
        }
        // api router
        if (this.opts.apiRoot) {
            const apiRouter = router.mount(this.opts.apiPrefix);
            this.setupApiFilters(apiRouter, this.auth);
            apiRouter.use('/', this.opts.apiRoot);
        }
        // other user defined routes
        this.setupRoutes(router);
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