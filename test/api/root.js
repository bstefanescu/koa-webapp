const WebApp = require('../..');
const Users = require('./users');

class Root extends WebApp.Resource {

    get(ctx) {
        ctx.body = {
            version: this.app.version
        }
    }

    routes(router) {
        router.use('/users', Users);
    }

}

module.exports = Root;
