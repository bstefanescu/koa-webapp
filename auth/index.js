const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Principal = require('./principal.js')
const KoaAuthentication = require('./koa.js');

const USER_NOT_FOUND = 'USER_NOT_FOUND';
const PASSWORD_MISMATCH = 'PASSWORD_MISMATCH';

class UserNotFoundError extends Error {
    constructor(username) {
        super('User not found: '+ username);
        this.code = USER_NOT_FOUND;
        this.username = username;
    }
}

class PasswordMismatchError extends Error {
    constructor(username) {
        super('Password mismatch for user '+ username);
        this.code = PASSWORD_MISMATCH;
        this.username = username;
    }
}

class AuthService {

    /**
     * Create an authentications ervice instnce.
     * Optios:
     *{
     *   findUser: function,
     *   secret: string | array,
     *   allowAnoymous: false, // allow anonymous to access
     *   requestTokenHeader: 'x-koa-webapp-request-token',
     *   jwtSignOpts: { ... jsonwebtoken sign opts ... },
     *   jwtVerifyOpts: { ... jsonwebtoken verify opts ... },
     *   cookie: false | true | string | {
     *       name: 'koa-webapp-auth',
     *       ... cookies.set options ...
     *   }
     *}
     * @param {object} opts
     */
    constructor(opts = {}) {
        if (!opts.findUser) {
            throw new Error('Required "findUser" option was not defined.');
        }
        if (!opts.secret || !opts.secret.length) {
            throw new Error('Invalid secret option. Must be a string on a non empty array');
        }
        if(!opts.requestTokenHeader) {
            opts.requestTokenHeader = 'x-koa-webapp-request-token';
        }
        this.opts = opts;
        const secretOpt = opts.secret;
        if (typeof secretOpt === 'string') {
            this.secrets = [secretOpt];
        } else if (Array.isArray(secretOpt)) {
            this.secrets = secretOpt;
        }
        this.allowAnonymous = opts.allowAnonymous || false;
        // anonymous virtual principal
        this.anonymous = Object.freeze(this.createPrincipal('#anonymous'));
        // admin virtual principal
        this.admin = Object.freeze(this.createPrincipal('#admin'));
        // jwt options:
        this.jwtSignOpts = Object.assign({
            expiresIn: "3h",
        }, opts.jwtSignOpts || {});
        this.jwtVerifyOpts = Object.assign({}, opts.jwtVerifyOpts || {});

        const defaultCookie = {
            name: 'koa-webapp-auth',
            path: '/auth/token',
            httpOnly: true,
            sameSite: 'strict',
            secure: true,
            overwrite: true
        }
        if (typeof opts.cookie === 'string') {
            this.cookie = Object.assign(defaultCookie, {
                name: opts.cookie
            });
        } else if (opts.cookie) {
            this.cookie = Object.assign(defaultCookie, opts.cookie);
        } else if (opts.cookie === false) {
            this.cookie = false;
        } else {
            this.cookie = defaultCookie;
        }

        this.koa = new KoaAuthentication(this);
    }

    hash(text) {
        return crypto.createHash('md5').update(text).digest('hex');
    }

    findUser(name) {
        const user = this.opts.findUser(name);
        if (!user) {
            throw new UserNotFoundError(name);
        }
        return user;
    }

    createPrincipal(name, userData) {
        let principal;
        if (userData) {
            principal = new Principal(name).fromUser(userData);
        } else {
            if (name === '#anonymous') {
                principal = new Principal(name, Principal.ANONYMOUS);
            } else if (name === '#admin') {
                principal = new Principal(name, Principal.ADMIN);
            } else {
                throw new Error('Invalid vritual principal name: '+name+'. Only "#anonymous" and "#admin" are accepted');
            }
        }
        return principal;
    }

    /**
     * Login using an username / password.
     * If login is successfull, returns a Principal object, otherwise throws an Error.
     * @throws UserNotFoundError or PasswordMismatchError
     * @param {*} name
     * @param {*} password
     * @returns a principal object
     */
    passwordLogin(name, password) {
        const user = this.findUser(name);
        if (user.password && this.hash(password) !== user.password) {
            throw new PasswordMismatchError(name);
        }
        return this.createPrincipal(name, user);
    }

    refreshLogin(principal) {
        if (principal.isVirtual) {
            // a virtual user - return back the principal
            return principal;
        } else {
            // fetch the user again to re-create the principal
            return this.createPrincipal(principal.name, this.findUser(principal.name));
        }

    }

    /**
     * Prform a login given a JWT.
     * If login is usccessfull, returns a Principal object, otherwise throws an Error.
     * @throws if no matching user is found or Error if token validation fails
     * @param {*} token
     * @returns the principal corresponding to the JWT
     */
    jwtLogin(token) {
        return new Principal().fromJWT(this.verifyJWT(token));
    }

    /**
     * Verify the given token agaisnt the registered secrets and return the decoded token
     * @param {*} token
     * @throws error if token fails to validate
     * @returns the decoded token on success otherwise throws an error
     */
    verifyJWT(token, opts) {
        opts = Object.assign(this.jwtVerifyOpts, opts || {});
        let decodedToken, error;
        for (const secret of this.secrets) {
            try {
                decodedToken = jwt.verify(token, secret, opts);
                break;
            } catch (e) {
                error = e;
                // continue;
            }
        }
        if (!decodedToken) {
            throw error ? error : new Error('JWT validation error');
        }
        return decodedToken;
    }

    signJWT(payload, opts) {
        opts = Object.assign(this.jwtSignOpts, opts || {});
        return jwt.sign(payload, this.secrets[0], this.jwtSignOpts);
    }
}

AuthService.USER_NOT_FOUND = USER_NOT_FOUND;
AuthService.PASSWORD_MISMATCH = PASSWORD_MISMATCH;

module.exports = AuthService;
