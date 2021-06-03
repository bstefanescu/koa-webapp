const WebApp = require('../../');

class User extends WebApp.Resource {

    get(ctx) {
        ctx.body = {
            'uid': ctx.params.userId,
            'firstName': 'Foo',
            'lastName': 'bar',
        }
    }

    getToken(ctx) {
        ctx.body = {token: 'bla', 'uid': ctx.params.userId}
    }

    routes(router) {
        router.get('/token', this.getToken)
    }
}

module.exports = User;
