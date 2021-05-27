const path = require('path');
const callsites = require('callsites');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const AuthService = require('./auth');
const Router = require('./router');
const Endpoint = require('./router/endpoint');
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
        this.resolveFile = createFileResolver(callsites());
        this.opts = Object.assign({}, opts);
        this.opts.api = Object.assign({
            files: 'api/**.js',
            prefix: '/api'
        }, this.opts.api || {});
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
        const apiRouter = router.mount(this.opts.api.prefix);
        apiRouter.filter(auth.koa.authMiddleware());
        apiRouter.load(this.resolveFile(this.opts.api.files));
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