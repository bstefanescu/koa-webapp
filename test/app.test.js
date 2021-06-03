
const assert = require('assert');
const path = require('path');
const request = require('supertest');
const WebApp = require('..');

class TestWebApp extends WebApp {
    constructor(opts) {
        super(opts);
    }
    findUser(emailOrName) {
        if (emailOrName === 'banned') return null;
        return {
            name: emailOrName,
            email: emailOrName,
            nickname: emailOrName,
            role: 'admin'
        }
    }
    setupFilters(router) {
        router.get('/from', '/to'); // a redirect
    }

    get apiRoot() {
        return require('./api/root.js');
    }
}

let server;
const app = new TestWebApp({
    auth: {
        allowAnonymous: true,
        cookie: {
            // we need to turn secure and sameSite off since when testing we are not over https
            sameSite: false,
            secure: false
        }
    },
    serve: {
        root: path.join(__dirname, 'web')
    },
    //apiRoot: require('./api/root.js')
});
app.version = '1.0';

before(() => {
    server = app.listen(9099, () => false); // silent mode
});

after(() => {
    server.close();
})

describe('Test static routes', () => {
    it('GET / => 200', done => {
        request(server).get('/').expect(200).then(res => {
            assert.strictEqual(res.text, '<html><body>index</body></html>')
            done();
        }).catch(err => done(err));
    });
    it('GET /css/style.css => 200', done => {
        request(server).get('/css/style.css').expect(200).then(res => {
            assert.strictEqual(res.text, 'body { color:red }')
            done();
        }).catch(err => done(err));
    });

    it('GET /from => redirect to /to', done => {
        request(server).get('/from').expect(301, done);
    });

});

describe('Test API routes', () => {

    app.auth.allowAnonymous = false; // turn off temporary to run the following test
    it('GET api/v1 => 401 if not signed-in', done => {
        request(server).get('/api/v1').expect(401).then(res => {
            app.auth.allowAnonymous = true; // put back anonymous access
            done();
        }).catch(err => done(err));
    });

    it('GET api/v1 => app instance is injected in endpoint', done => {
        request(server).get('/api/v1').expect(200)
        .expect('Content-Type', /json/)
        .then(res => {
            assert.strictEqual(res.body.version, app.version)
            done();
        }).catch(err => done(err));
    });

    it('POST api/v1 => 405', done => {
        request(server).post('/api/v1').expect(405, done);
    });

    it('GET /api/v1/users => 405', done => {
        request(server).get('/api/v1/users').expect(405, done);
    });

    it('POST JSON to api/v1/users => 200', done => {
        request(server).post('/api/v1/users')
        .send({name: 'John'})
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(res => {
            assert.strictEqual(res.body.status, 'ok');
            assert.strictEqual(res.body.user.name, 'John');
            done();
        }).catch(err => done(err));
    });

    it('POST urlencoded form to api/v1/users => 415', done => {
        request(server).post('/api/v1/users')
        .send({name: 'John'})
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Accept', 'application/json')
        .expect(415, done);
    });

    it('GET /api/v1/users/:userId => 200', done => {
        request(server).get('/api/v1/users/123').expect(200)
        .expect('Content-Type', /json/)
        .then(res => {
            assert.strictEqual(res.body.uid, '123')
            done();
        }).catch(err => done(err));
    });

    it('GET /api/v1/users/:userId/token => 200', done => {
        request(server).get('/api/v1/users/1234/token').expect(200)
        .expect('Content-Type', /json/)
        .then(res => {
            assert.strictEqual(res.body.uid, '1234')
            assert.strictEqual(res.body.token, 'bla')
            done();
        }).catch(err => done(err));
    });

});

describe('Test Authentication', () => {

    it('POST /auth/token => 403 without x-koa-webapp-request-token header', done => {
        request(server).post('/auth/token').expect(403, done);
    });

    it('POST /auth/token => 401 if not signed-in', done => {
        request(server).post('/auth/token')
        .set('x-koa-webapp-request-token', 'true')
        .set('Content-Type', 'application/json')
        .expect(401, done);
    });

    it('POST /auth/login => 400 with invalid fields', done => {
        request(server).post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({email: 'Foo', password: 'Bar'})
        .expect(400).then(res => {
            assert.strictEqual(res.body.statusCode, 400);
            done();
        }).catch(err => done(err));
    });

    it('POST /auth/login => 401 with invalid login', done => {
        request(server).post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({username: 'banned', password: 'banned'})
        .expect(401).then(res => {
            assert.strictEqual(res.body.statusCode, 401);
            done();
        }).catch(err => done(err));
    });

    let authCookie;
    it('POST /auth/login => 200 with valid user info', done => {
        request(server).post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({username: 'Foo', password: 'Bar'})
        .expect(200).then(res => {
            const cookies = res.header['set-cookie'];
            assert.ok(cookies && cookies[0].startsWith('koa-webapp-auth='));
            assert.strictEqual(res.body.principal.name, 'Foo')
            assert.ok(res.body.token);
            authCookie = cookies[0];
            done();
        }).catch(err => done(err));
    });

    it('POST /auth/token => 200 when signed in', done => {
        request(server).post('/auth/token')
        .set('Cookie', authCookie)
        .set('x-koa-webapp-request-token', 'true')
        .set('Content-Type', 'application/json')
        .expect(200, done);
    });

});
