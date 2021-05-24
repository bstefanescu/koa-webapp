const path = require('path');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const AuthService = require('./auth');
const Router = require('./router');
const Endpoint = require('./router/endpoint');
const PORT = process.env.PORT || 8080;

class WebApp {
    /**
     * opts: {
     *   prefix: '/',
     *   api: {
     *     files: 'api/**.js',
     *     prefix: '/api/v1'
     *   },
     *   auth: {auth options}
     * }
     * @param {object} opts
     */
    constructor(opts = {}) {
        this.opts = Object.assign({}, opts);
        this.opts.api = Object.assign({
            files: 'api/**.js',
            prefix: '/api'
        }, this.opts.api || {});
        this.resolvePath = filePath => path.resolve(filePath);
        this.router = new Router(this.opts.prefix || '/');
        this.router.app = this;
        if (!this.opts.auth) {
            this.opts.auth = {};
        }
        this.opts.auth.findUser = this.findUser.bind(this);
        this.auth = new AuthService(this.opts.auth);
        this.setup(this.router, this.auth);
    }

    findUser(nameOrEmail) {
        throw new Error('findUser(nameOrEmail) not implemented');
    }

    setup(router, auth) {
        router.filter(bodyParser());
        // serve static resources
        router.serve('web', {
            prefix: '/',
            exclude: ['/api/*', '/auth/*']
        });
        // auth endpoints
        router.post('/auth/login', auth.koa.loginMiddleware());
        router.post('/auth/logout', auth.koa.logoutMiddleware());
        // api router
        const apiRouter = router.mount(this.opts.api.prefix)//.filter(auth.koa.authMiddleware());
        apiRouter.load(this.resolvePath(this.opts.api.files));
    }

    middleware() {
        return this.router.routes();
    }

    listen(port, cb) {
        const server = new Koa();
        server.use(this.middleware());
        if(!port) {
            port = PORT;
        } else if(typeof port === 'function') {
            cb = port;
            port = PORT;
        }
        server.listen(port, () => {
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