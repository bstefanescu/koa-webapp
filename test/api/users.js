const WebApp = require('../../');

class UsersEndpoint extends WebApp.Endpoint {

    constructor(app) {
        super('/users');
        this.app = app;
    }

    async post(ctx) {
        const body = await ctx.request.body;
        body.assertJSON();
        ctx.body = {
            status: 'ok',
            user: body.json
        }
    }

}

module.exports = UsersEndpoint;
