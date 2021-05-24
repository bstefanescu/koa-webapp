const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Principal = require('./principal.js')
const KoaAuthentication = require('./koa.js');

const USER_NOT_FOUND = 'USER_NOT_FOUND';
const PASSWORD_MISMATCH = 'PASSWORD_MISMATCH';
const INVALID_JWT = 'INVALID_JWT';

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

class InvalidJWTError extends Error {
    constructor(msg) {
        super('Invalid JWT: '+ msg);
        this.code = INVALID_JWT;
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
     *   jwt: {
     *       sign: { ... jsonwebtoken sign opts ... },
     *       verify: { ... jsonwebtoken verify opts ... },
     *    },
     *    cookie: false | true | string | {
     *       name: 'koa.session',
     *       options: { ... cookies.set options ... }
     *    },
     *    oauth2: {
     *    }
     *}
     * @param {function} findUserByNameOrEmail
     * @param {object} opts
     */
    constructor(opts = {}) {
        if (!opts.findUser) {
            throw new Error('Required "findUser" option was not defined.');
        }
        if (!opts.secret || !opts.secret.length) {
            throw new Error('Invalid secret option. Must be a string on a non empty array');
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
        this.anonymous = Object.freeze(this.createPrincipal('@anonymous'));
        // admin virtual principal
        this.admin = Object.freeze(this.createPrincipal('@admin'));
        // jwt options:
        this.jwtSignOpts = Object.assign({
            expiresIn: "1h",
        }, (opts.jwt && opts.jwt.sign) || {});
        this.jwtVerifyOpts = Object.assign({}, (opts.jwt && opts.jwt.verify) || {});

        if (typeof opts.cookie === 'string') {
            this.cookie = { name: opts.cookie };
        } else if (opts.cookie) {
            this.cookie = opts.cookie;
            if (!this.cookie.name) {
                this.cookie.name = 'koa.session';
            }
        } else {
            this.cookie = false;
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
            principal = new Principal(name, userData);
        } else {
            if (name === '@anonymous') {
                principal = new Principal(name, {
                    role: 'anonymous'
                });
                principal.isAnonymous = true;
            } else if (name === '@admin') {
                principal = new Principal(name, {
                    role: 'admin'
                });
                principal.isAdmin = true;
            } else {
                throw new Error('Invalid vritual principal name: '+name+'. Only "@anonymous" and "@admin" are accepted');
            }
        }
        return principal;
    }

    verifyPassword(name, password) {
        const user = this.findUser(name);
        if (arguments.length === 2
            && this.hash(password) !== user.password) {
            throw new PasswordMismatchError(name);
        }
        return this.createPrincipal(name, user);
    }

    /**
     * Verify the given token agaisnt the registered secrets and return the corresponding user on success or null on failure
     * @param {*} token
     * @returns the user object or throws
     */
    verifyJWT(token) {
        let decodedToken;
        for (const secret of this.secrets) {
            try {
                decodedToken = jwt.verify(token, secret, this.jwtVerifyOpts);
                break;
            } catch (e) {
                // continue;
            }
        }
        if (decodedToken) {
            return this.createPrincipal(this.findUser(getUserNameFromJWT(decodedToken)));
        }
        throw new InvalidJWTError('failed to verify');
    }

    createJWTPayload(user) {
        return { sub : user.name };
    }

    signJWT(user) {
        if (user.isAuthenticated) {
            return jwt.sign(this.createJWTPayload(user), this.secrets[0], this.jwtSignOpts);
        } else {
            return null;
        }
    }

    getUserNameFromJWT(jwt) {
        return jwt.sub;
    }
}

AuthService.USER_NOT_FOUND = USER_NOT_FOUND;
AuthService.PASSWORD_MISMATCH = PASSWORD_MISMATCH;
AuthService.INVALID_JWT = INVALID_JWT;

module.exports = AuthService;
