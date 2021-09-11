const http = require('http');
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
            findUser: this.findUser ? this.findUser.bind(this) : opts.findUser,
            verifyPassword: this.verifyPassword ? this.verifyPassword.bind(this) : opts.verifyPassword,
            principal: opts.principal,
            secret: opts.secret,
            allowAnonymous: opts.allowAnonymous,
            requestTokenHeader: opts.requestTokenHeader,
            cookie: opts.authCookie,
            jwtSignOpts: opts.jwtSignOpts,
            jwtVerifyOpts: opts.jwtVerifyOpts
        });
        Body.install(koa, opts.bodyOptions);
        this.opts = opts;
    }

    get defaultOptions() {
        return {
            exitHooks: true,
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
     * @param {Router} router
     * @protected
     */
    setupFilters(router) {
        // nothing to do by default
    }

    /**
     * Setup main routes
     * @param {Router} router
     * @protected
     */
    setupRoutes(router) {
        // nothing to do by default
    }

    /**
     *
     * @param {Router} apiRouter
     * @param {AuthService} auth
     * @protected
     */
    setupApiFilters(apiRouter, auth) {
        apiRouter.use(auth.koa.authMiddleware());
    }

    /**
     *
     * @param {Router} authRouter
     * @param {AuthService} auth
     */
    setupAuth(authRouter, auth) {
        authRouter.post('/login', auth.koa.loginMiddleware());
        authRouter.post('/logout', auth.koa.logoutMiddleware());
        authRouter.post('/token', auth.koa.tokenMiddleware());
        authRouter.post('/refresh', auth.koa.refreshMiddleware());
    }

    /**
     * use this to setup koa and your routes
     * @param {Router} router
     * @param {AuthService} auth
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
            this.setupAuth(authRouter, auth);
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

    createServer() {
        return http.createServer(this.callback());
    }

    async start(port, cb) {
        await this.setup();
        // add routes
        this.koa.use(this.router.middleware());
        // install exit hooks
        if (this.opts.exitHooks) {
            const onSigExit = async signal => {
                await this.stop();
                process.exit(0);
            }
            process.on('SIGINT', onSigExit);
            process.on('SIGTERM', onSigExit);
        }
        if (this.onStart) {
            await this.onStart();
        }
        // start http server
        return new Promise(resolve => {
            this.server = this.createServer();
            this.server.listen(port, () => {
                if (!this.opts.quiet) console.log(`App listening on port ${port}\nPress Ctrl+C to quit.`);
                resolve(this);
            });
        });
    }

    stop() {
        if (this.server) {
            return new Promise(resolve => {
                this.server.close(async () => {
                    if (this.onStop) {
                        await  this.onStop();
                    }
                    this.server = null;
                    resolve();
                });
            });
        }
    }

}

WebApp.Resource = Resource;
module.exports = WebApp;