const assert = require('assert');
const AuthService = require('../auth');
const Principal = require('../auth/principal');

const USERS = {}
const auth = new AuthService({
    secret: 'the secret',
    findUser(name) {
        return USERS[name];
    }
});

USERS.john = {
    name: 'john',
    email: 'john@doe.com',
    nickname: 'joe',
    role: 'admin',
    password: auth.hash('mysecret')
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
        let principal1 = new Principal();
        let jwt = principal1.fromUser(USERS.john).toJWT();
        let principal2 = new Principal();
        principal2.fromJWT(jwt);
        assert.deepStrictEqual(principal1, principal2);
    })

});