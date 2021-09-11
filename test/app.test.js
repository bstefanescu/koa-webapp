const {verifyPassword, hash} = require('./password.js');
const MyPrincipal = require('./my-principal.js');
const assert = require('assert');
const path = require('path');
const request = require('supertest');
const WebApp = require('..');

let USER_EMAIL = 'foo@bar.com';

const USERS = {
    Foo: {
        id: 'foo-123',
        name: 'Foo',
        email: 'foo@bar.com',
        nickname: 'Foo',
        role: 'admin',
        password: hash('Bar')
    },
    banned: {
        id: 'banned-xxx',
        name: 'banned',
        email: 'foo@bar.com',
        nickname: 'Banned',
        role: 'admin',
        password: hash('banned')
    },
    John: {
        id: 'foo-123',
        name: 'John',
        email: 'john@bar.com',
        nickname: 'John',
        role: 'admin',
        password: hash('test')
    },
}

class TestWebApp extends WebApp {

    constructor() {
        super({
            serveFilters: [
                (ctx, next) => {
                    ctx.set('Serve-Custom-Header', 'test');
                    return next();
                }
            ],
            apiRoot: require('./api/root.js'),
            serveRoot: path.join(__dirname, 'web'),
            serveExclude: [ '/auth/*', '/api/*', '/methods/*' ],
            allowAnonymous: true,
            authCookie: {
                // we need to turn secure and sameSite off since when testing we are not over https
                sameSite: false,
                secure: false
            },
            principal: MyPrincipal,
            verifyPassword: verifyPassword
        });
    }

    findUser(emailOrName) {
        if (emailOrName === 'banned') return null;
        return USERS[emailOrName];
        // return {
        //     id: 'foo-123',
        //     name: emailOrName,
        //     email: USER_EMAIL,
        //     nickname: emailOrName,
        //     role: 'admin'
        // }
    }

    setupFilters(router) {
        router.get('/from', '/to'); // a redirect
    }

    setupRoutes(router, auth) {
        const tmRouter = router.mount('/methods');
        tmRouter.methods('trace');
        tmRouter.get('/', ctx => ctx.status = 202);
        tmRouter.post('/', ctx => ctx.status = 202);
        tmRouter.put('/', ctx => ctx.status = 202);
        tmRouter.del('/', ctx => ctx.status = 202);
        tmRouter.head('/', ctx => ctx.status = 202);
        tmRouter.options('/', ctx => ctx.status = 202);
        tmRouter.patch('/', ctx => ctx.status = 202);
        tmRouter.trace('/', ctx => ctx.status = 202);
        super.setupRoutes(router, auth);
    }

}

let server;
const app = new TestWebApp();
app.version = '1.0';

before(async () => {
    await app.start(9099); // silent mode
    server = app.server;
});

after(() => {
    app.server.close();
})

describe('Test static routes', () => {
    it('GET / => 200', done => {
        request(server).get('/').expect(200).then(res => {
            assert.strictEqual(res.text, '<html><body>index</body></html>')
            assert.strictEqual(res.headers['serve-custom-header'], 'test')
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
            // static serve headers not set
            assert.ok(!res.headers['serve-custom-header']);
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

describe('Test HTTP method functions on main router', () => {
    it('HEAD', done => {
        request(server).head('/methods').expect(202, done);
   });

    it('DELETE', done => {
        request(server).delete('/methods').expect(202, done);
    });
    it('PUT', done => {
        request(server).put('/methods').expect(202, done);
    });
    it('OPTIONS', done => {
        request(server).options('/methods').expect(202, done);
    });
    it('PATCH', done => {
        request(server).patch('/methods').expect(202, done);
    });

    it('TRACE (custom)', done => {
        request(server).trace('/methods').expect(202, done);
    });
});

describe('Test HTTP method functions on Resource router', () => {
    it('DELETE', done => {
        request(server).delete('/api/v1/users/1234/token').expect(202, done);
    });
    it('PUT', done => {
        request(server).put('/api/v1/users/1234/token').expect(202, done);
    });
    it('HEAD', done => {
        request(server).head('/api/v1/users/1234/token').expect(202, done);
    });
    it('OPTIONS', done => {
        request(server).options('/api/v1/users/1234/token').expect(202, done);
    });
    it('PATCH', done => {
        request(server).patch('/api/v1/users/1234/token').expect(202, done);
    });
    it('TRACE (custom)', done => {
        request(server).trace('/api/v1/users/1234/token').expect(202, done);
    });
});

describe('Test Authentication', () => {

    beforeEach(() => {
        // turn off anonymous access
        app.auth.allowAnonymous = false;
    });

    afterEach(() => {
        // turn on anonymous access
        app.auth.allowAnonymous = true;
    });


    it('Can access API root without JWT if anonymous access is allowed', done => {
        app.auth.allowAnonymous = true;
        request(server).get('/api/v1').expect(200, done);
    });

    it('Cannot access API root without JWT', done => {
        request(server).get('/api/v1').expect(401, done);
    });

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
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({email: 'Foo', password: 'Bar'})
        .expect(400).then(res => {
            assert.strictEqual(res.body.statusCode, 400);
            done();
        }).catch(err => done(err));
    });

    it('POST /auth/login => 401 with invalid login', done => {
        request(server).post('/auth/login')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({username: 'banned', password: 'banned'})
        .expect(401).then(res => {
            assert.strictEqual(res.body.statusCode, 401);
            done();
        }).catch(err => done(err));
    });

    let authCookie, authToken, principal;
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
        .expect(200).then(res => {
            authToken = res.body.token;
            principal = res.body.principal;
            assert.strictEqual(principal.email, USER_EMAIL);
            done();
        }).catch(err=>done(err));
    });

    it('Can access API root with JWT', done => {
        request(server)
        .get('/api/v1')
        .auth(authToken, { type: 'bearer' })
        .expect(200, done);
    });

    it('Can refresh token using /auth/refresh', done => {
        // modify the user email
        USERS.Foo.email = 'john@doe.com';
        request(server).post('/auth/refresh')
        .set('Cookie', authCookie)
        .set('x-koa-webapp-request-token', 'true')
        .set('Content-Type', 'application/json')
        .expect(200).then(res => {
            authToken = res.body.token;
            principal = res.body.principal;
            assert.strictEqual(principal.email, 'john@doe.com');
            done();
        }).catch(err=>done(err));
    });

    it('Can refresh token using /auth/token and x-koa-webapp-request-token:refresh header', done => {
        // modify the user email
        USERS.Foo.email = 'jane@doe.com';

        request(server).post('/auth/token')
        .set('Cookie', authCookie)
        .set('x-koa-webapp-request-token', 'refresh')
        .set('Content-Type', 'application/json')
        .expect(200).then(res => {
            authToken = res.body.token;
            principal = res.body.principal;
            assert.strictEqual(principal.email, 'jane@doe.com');
            done();
        }).catch(err=>done(err));
    });

    it('ctx.state.principal is set', done => {
        request(server)
        .get('/api/v1/testPrincipalStack?email=jane@doe.com')
        .auth(authToken, { type: 'bearer' })
        .expect(202, done);
    });

    it('can logout', done => {
        request(server)
        .post('/auth/logout')
        .expect(204, done);
    });

});

describe('Test Body Request', () => {

    it('post json to json endpoint => body.json works as expected', done => {
        request(server).post('/api/v1/users/postJSON')
        .send({name: 'John'})
        //.set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).then(res => {
            assert.strictEqual(res.body.got.name, 'John');
            done();
        }).catch(err => done(err));
    });

    it('post xml to json endpoint => body.json fails', done => {
        request(server).post('/api/v1/users/postJSON')
        .send('<name>John</name>')
        .set('Content-Type', 'application/xml')
        .set('Accept', 'application/json')
        .expect(415, done);
    });

    it('post xml to xml endpoint => body.xml works as expected', done => {
        request(server).post('/api/v1/users/postXML')
        .send('<name>John</name>')
        .set('Content-Type', 'application/xml')
        .set('Accept', 'application/json')
        .expect(200).then(res => {
            assert.strictEqual(res.body.got.name, 'John');
            done();
        }).catch(err => done(err));
    });

    it('post urlencoded to xml endpoint => body.xml works as expected', done => {
        request(server).post('/api/v1/users/postXML')
        .send('name=John')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Accept', 'application/json')
        .expect(415, done);
    });

    it('post urlencoded to form endpoint => body.params works as expected', done => {
        request(server).post('/api/v1/users/postUrlencoded')
        .send('name=John')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Accept', 'application/json')
        .expect(200).then(res => {
            assert.strictEqual(res.body.got.name, 'John');
            done();
        }).catch(err => done(err));
    });

    it('post multipart to multipart endpoint => body.params works as expected', done => {
        request(server).post('/api/v1/users/postMultipart')
        .field('name', 'John')
        .attach('note', __filename)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .expect(200).then(res => {
            assert.strictEqual(res.body.got.name, 'John');
            done();
        }).catch(err => done(err));
    });

    it('post text/* to text endpoint => body.text works as expected', done => {
        request(server).post('/api/v1/users/postText')
        .send('bla')
        .set('Content-Type', 'text/plain')
        .set('Accept', 'application/json')
        .expect(200).then(res => {
            assert.strictEqual(res.body.got, 'bla');
            done();
        }).catch(err => done(err));
    });

});
