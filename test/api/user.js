const WebApp = require('../../');

class UserEndpoint extends WebApp.Endpoint {

    constructor(app) {
        super('/users/:userId');
        this.app = app;
    }

    get(ctx) {
        ctx.body = {
            'uid': ctx.params.userId,
            'firstName': 'Foo',
            'lastName': 'bar',
        }
    }

}

module.exports = UserEndpoint;
