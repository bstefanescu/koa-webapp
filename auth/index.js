const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Principal = require('./principal.js');
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
     *   findUser: function(name),
     *   verifyPassword: function(user, password), // a function to verify if a user password match the given password
     *   principal: class extending Principal, // the Principal class to use defaults to builtin Principal
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
        this.Principal = opts.principal || Principal;
        const secretOpt = opts.secret;
        if (typeof secretOpt === 'string') {
            this.secrets = [secretOpt];
        } else if (Array.isArray(secretOpt)) {
            this.secrets = secretOpt;
        }
        this.allowAnonymous = opts.allowAnonymous || false;
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

    async findUser(name) {
        const user = await this.opts.findUser(name);
        if (!user) {
            throw new UserNotFoundError(name);
        }
        return user;
    }

    createPrincipal(name, userData) {
        let principal = new this.Principal(name);
        principal.fromUser(userData);
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
    async passwordLogin(name, password) {
        const user = await this.findUser(name);
        if (!this.opts.verifyPassword) {
            throw new Error('No verifyPassword method defined');
        }
        if (await this.opts.verifyPassword(user, password) === true) {
            return this.createPrincipal(name, user);
        } else {
            throw new PasswordMismatchError(name);
        }
    }

    async refreshLogin(principal) {
        if (principal.isVirtual) {
            // a virtual user - return back the principal
            return principal;
        } else {
            // fetch the user again to re-create the principal
            return this.createPrincipal(principal.name, await this.findUser(principal.name));
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
        const decodedToken = this.verifyJWT(token);
        const principal = new this.Principal(decodedToken.sub);
        principal.fromJWT(decodedToken);
        return principal;
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

    signJWT(principal, opts) {
        const payload = { sub: principal.name };
        principal.writeJWT(payload);
        opts = Object.assign(this.jwtSignOpts, opts || {});
        return jwt.sign(payload, this.secrets[0], this.jwtSignOpts);
    }
}

AuthService.USER_NOT_FOUND = USER_NOT_FOUND;
AuthService.PASSWORD_MISMATCH = PASSWORD_MISMATCH;

module.exports = AuthService;
