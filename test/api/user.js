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
        router.methods(['trace']);
        router.get('/token', this.getToken)
        // test other methods
        router.del('/token', this.delToken)
        router.put('/token', this.putToken)
        router.options('/token', this.optToken)
        router.head('/token', this.headToken)
        router.patch('/token', this.patchToken)
        router.trace('/token', this.traceToken)
    }

    delToken(ctx) {
        ctx.status = 202;
    }
    putToken(ctx) {
        ctx.status = 202;
    }
    optToken(ctx) {
        ctx.status = 202;
    }
    headToken(ctx) {
        ctx.status = 202;
    }
    patchToken(ctx) {
        ctx.status = 202;
    }
    traceToken(ctx) {
        ctx.status = 202;
    }

}

module.exports = User;
