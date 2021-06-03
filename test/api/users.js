const WebApp = require('../../');
const User = require('./user');

class Users extends WebApp.Resource {

    async post(ctx) {
        const body = await ctx.request.body;
        body.assertJSON();
        ctx.body = {
            status: 'ok',
            user: body.json
        }
    }

    routes(router) {
        router.use('/:userId', User);
    }
}

module.exports = Users;
