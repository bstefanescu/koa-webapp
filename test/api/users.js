const assert = require('assert');
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

    setup(router) {
        router.post('/postJSON', this.postJSON);
        router.post('/postXML', this.postXML);
        router.post('/postUrlencoded', this.postUrlencoded);
        router.post('/postMultipart', this.postMultipart);
        router.post('/postText', this.postText);
        // must be the last
        router.use('/:userId', User);
    }

    async postJSON(ctx) {
        const body = await ctx.request.body;
        body.assertJSON();
        assert.ok(body.isJSON);
        assert.ok(!body.isXML);
        assert.ok(!body.isForm);
        assert.ok(!body.isMultipart);
        assert.ok(!body.isText);
        assert.strictEqual(body.json , body.data);
        assert.ok(body.json);
        assert.ok(!body.xml);
        assert.ok(!body.params);
        assert.ok(!body.files);
        assert.ok(body.text === body.raw);
        ctx.body = {
            got: body.json
        }
    }

    async postXML(ctx) {
        const body = await ctx.request.body;
        body.assertXML();
        assert.ok(!body.isJSON);
        assert.ok(body.isXML);
        assert.ok(!body.isForm);
        assert.ok(!body.isMultipart);
        assert.ok(!body.isText);
        assert.strictEqual(body.xml , body.data);
        assert.ok(!body.json);
        assert.ok(body.xml);
        assert.ok(!body.params);
        assert.ok(!body.files);
        assert.ok(body.text === body.raw);
        ctx.body = {
            got: body.xml
        }
    }

    async postUrlencoded(ctx) {
        const body = await ctx.request.body;
        body.assertForm();
        assert.ok(!body.isJSON);
        assert.ok(!body.isXML);
        assert.ok(body.isForm);
        assert.ok(!body.isMultipart);
        assert.ok(!body.isText);
        assert.strictEqual(body.params , body.data);
        assert.ok(!body.json);
        assert.ok(!body.xml);
        assert.ok(body.params);
        assert.ok(!body.files);
        assert.ok(body.text === body.raw);
        ctx.body = {
            got: body.params
        }
    }

    async postMultipart(ctx) {
        const body = await ctx.request.body;
        body.assertMultipart();
        assert.throws(() => body.assertJSON())
        assert.throws(() => body.assertXML())
        assert.throws(() => body.assertForm())
        assert.throws(() => body.asserTest())
        assert.ok(!body.isJSON);
        assert.ok(!body.isXML);
        assert.ok(!body.isForm);
        assert.ok(body.isMultipart);
        assert.ok(!body.isText);
        assert.strictEqual(body.params , body.data);
        assert.ok(!body.json);
        assert.ok(!body.xml);
        assert.ok(body.params);
        assert.ok(body.files);
        assert.ok(body.text === body.raw);
        assert.ok(Object.keys(body.files).length === 1);
        ctx.body = {
            got: body.params
        }
    }

    async postText(ctx) {
        const body = await ctx.request.body;
        body.assertText();
        assert.throws(() => body.assertJSON())
        assert.throws(() => body.assertXML())
        assert.throws(() => body.assertForm())
        assert.throws(() => body.assertMultipart())
        assert.ok(!body.isJSON);
        assert.ok(!body.isXML);
        assert.ok(!body.isForm);
        assert.ok(!body.isMultipart);
        assert.ok(body.isText);
        assert.ok(!body.data);
        assert.strictEqual(body.text , body.raw);
        assert.ok(!body.json);
        assert.ok(!body.xml);
        assert.ok(!body.params);
        assert.ok(!body.files);
        assert.ok(body.text === body.raw);
        ctx.body = {
            got: body.text
        }
    }

}

module.exports = Users;
