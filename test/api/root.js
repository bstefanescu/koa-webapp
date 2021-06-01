const WebApp = require('../..');

class RootEndpoint extends WebApp.Endpoint {

    constructor(app) {
        super('/');
        this.app = app;
    }

    get(ctx) {
        ctx.body = {
            version: this.app.version
        }
    }

}

module.exports = RootEndpoint;
