const assert = require('assert');
const WebApp = require('../..');
const Users = require('./users');
const Superuser = require('../../auth/superuser.js');
const Anonymous = require('../../auth/anonymous.js');

class Root extends WebApp.Resource {

    get(ctx) {
        ctx.body = {
            version: this.app.version
        }
    }

    setup(router) {
        router.use('/users', Users);
        router.get('/testPrincipalStack', this.testPrincipalStack)
    }

    testPrincipalStack(ctx) {
        let principal = ctx.state.principal;
        assert.strictEqual(principal.email, ctx.request.query.email);
        assert.ok(!principal.isVirtual);

        // push the admin principal on the stack
        this.app.auth.koa.pushPrincipal(ctx, Superuser);
        principal = ctx.state.principal;
        assert.strictEqual(principal.name, '#superuser');
        assert.ok(principal.isVirtual);
        assert.ok(principal.isSuperuser);

        this.app.auth.koa.pushPrincipal(ctx, Anonymous);
        principal = ctx.state.principal;
        assert.strictEqual(principal.name, '#anonymous');
        assert.ok(principal.isVirtual);
        assert.ok(principal.isAnonymous);

        this.app.auth.koa.popPrincipal(ctx);
        principal = ctx.state.principal;
        assert.strictEqual(principal.name, '#superuser');
        assert.ok(principal.isVirtual);
        assert.ok(principal.isSuperuser);

        this.app.auth.koa.popPrincipal(ctx);
        principal = ctx.state.principal;
        assert.strictEqual(principal.email, ctx.request.query.email);
        assert.ok(!principal.isVirtual);

        ctx.status = 202;
    }

}

module.exports = Root;
