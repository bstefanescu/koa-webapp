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
        this.init && this.init(opts);
        this.koa = new Koa();
        this.koa.webapp = this;
        this.koa.proxy = !!this.proxy;
        this.koa.context.onerror = errorHandler(this.errorHandlerOptions);
        this.router = new Router(this.prefix || '/');
        this.router.app = this;
        this.router.notFoundMessage = this.notFoundMessage;
        this.auth = new AuthService({
            findUser: this.findUser.bind(this),
            secret: this.secret,
            allowAnonymous: this.allowAnonymous,
            requestTokenHeader: this.requestTokenHeader,
            cookie: this.authCookie,
            jwtSignOpts: this.jwtSignOpts,
            jwtVerifyOpts: this.jwtVerifyOpts
        });
        Body.install(this.koa, this.bodyOptions);
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

    /**
     * Setup main routes
     * @param {*} router
     */
    setupRoutes(router) {
        // nothing to do by default
    }

    setupApiFilters(apiRouter, auth) {
        apiRouter.use(auth.koa.authMiddleware());
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
        if (this.serveRoot) {
            router.serve(this.serveRoot, {
                prefix: this.servePrefix,
                exclude: this.serveExclude
            });
        }
        // auth endpoints
        if (this.authPrefix) {
            const authRouter = router.mount(this.authPrefix);
            authRouter.post('/login', auth.koa.loginMiddleware());
            authRouter.post('/logout', auth.koa.logoutMiddleware());
            authRouter.post('/token', auth.koa.tokenMiddleware());
            authRouter.post('/refresh', auth.koa.refreshMiddleware());
        }
        // api router
        if (this.apiRoot) {
            const apiRouter = router.mount(this.apiPrefix);
            this.setupApiFilters(apiRouter, this.auth);
            apiRouter.use('/', this.apiRoot);
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

    // ------ default configuration

    get prefix() {
        return '/';
    }
    get secret() {
        return [ crypto.randomBytes(48).toString('hex') ];
    }
    get notFoundMessage() {
        return 'Resource not found';
    }
    get apiRoot() {
        return null;
    }
    get apiPrefix() {
        return '/api/v1';
    }
    get authPrefix() {
        return '/auth';
    }
    get servePrefix() {
        return '/';
    }
    get serveExclude() {
        return ['/api/*', '/auth/*'];
    }
    get serveRoot() {
        return 'web';
    }
    get requestTokenHeader() {
        return 'x-koa-webapp-request-token';
    }
    get allowAnonymous() {
        return false;
    }
    get authCookie() {
        // use defaults
    }
    get jwtSignOpts() {
    }
    get jwtVerifyOpts() {
    }
    get proxy() {
    }
    get bodyOptions() {
    }
    get errorHandlerOptions() {
    }

}

WebApp.Resource = Resource;
module.exports = WebApp;