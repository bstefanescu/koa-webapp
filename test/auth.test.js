const assert = require('assert');
const AuthService = require('../auth');
const MyPrincipal = require('./my-principal.js');
const {hash, verifyPassword} = require('./password.js');


const USERS = {}
const auth = new AuthService({
    secret: 'the secret',
    principal: MyPrincipal,
    findUser(name) {
        return USERS[name];
    },
    verifyPassword: verifyPassword
});


USERS.john = {
    id: 'user-123',
    name: 'john',
    email: 'john@doe.com',
    nickname: 'joe',
    role: 'admin',
    password: hash('mysecret')
}


describe('AuthService unit tests', () => {

    it('Password login works', () => {
        const principal = auth.passwordLogin('john', 'mysecret');
        assert.strictEqual(principal.email, USERS.john.email);
    });

    it("Fail if password doesn't match", () => {
        try {
            const principal = auth.passwordLogin('john', 'myothersecret');
            assert.fail('Password must not match');
        } catch(e) {
            assert.strictEqual(e.code, AuthService.PASSWORD_MISMATCH)
        }
    });

    it("Fail if user was not found", () => {
        try {
            const principal = auth.passwordLogin('jane', 'myothersecret');
            assert.fail('Password must not match');
        } catch(e) {
            assert.strictEqual(e.code, AuthService.USER_NOT_FOUND)
        }
    });

    it("user to principal to jwt works", () => {
        let principal1 = new MyPrincipal('foo');
        let jwt = {sub:principal1.name};
        principal1.fromUser(USERS.john).writeJWT(jwt);
        let principal2 = new MyPrincipal('foo');
        principal2.fromJWT(jwt);
        assert.deepStrictEqual(principal1, principal2);
    })

});