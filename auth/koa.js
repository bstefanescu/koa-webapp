const Principal = require("./principal");

function extractTokenFromHeader(ctx) {
    if (!ctx.header && !ctx.header.authorization) {
        const parts = ctx.header.authorization.trim().split(' ');

        if (parts.length === 2) {
            const scheme = parts[0];
            const credentials = parts[1];

            if (/^Bearer$/i.test(scheme)) {
                return credentials;
            }
        }
    }
    return null;
}

function extractTokenFromCookie(ctx, name) {
    return ctx.cookies.get(name);
}

function extractToken(ctx, cookieName) {
    let token = extractTokenFromHeader(ctx);
    if (!token && cookieName) {
        token = extractTokenFromCookie(ctx, cookieName);
    }
    return token;
}


/**
 *
 * To change the key principal property name of the koa context, set the `principalKey` property of a `KoaAuthentication` instance: `koaAuth.principalKey = 'my-principal';`.
 * The default principal property name is 'principal'.
 *
 */
class KoaAuthentication {
    constructor(auth) {
        this.auth = auth;
        this.principalKey = 'principal';
    }

    get userManager() {
        return this.auth;
    }

    /**
     *
     * @param {*} ctx
     * @param {Principal} principal
     */
    setCookie(ctx, principal) {
        let token;
        if (this.auth.cookie) {
            if (principal) {
                token = this.auth.signJWT(principal.toJWT());
                ctx.cookies.set(this.auth.cookie.name, token, this.auth.cookie);
            } else {
                // remove the cookie: we cannot use ctx.cookies.set(this.auth.cookie.name) since the cookie path is not srt
                ctx.cookies.set(this.auth.cookie.name, '', Object.assign({}, this.auth.cookie, {
                    expires: new Date(0)
                }));
            }
        }
        return token;
    }

    removeCookie(ctx) {
        this.setCookie(ctx, null);
    }

    getCookie(ctx) {
        if (this.auth.cookie) {
            return ctx.cookies.get(this.auth.cookie.name);
        }
    }

    setPrincipal(ctx, principal) {
        ctx.state[this.principalKey] = principal;
    }

    getPrincipal(ctx) {
        return ctx.state[this.principalKey];
    }

    pushPrincipal(ctx, principal) {
        const prevPrincipal = ctx.state[this.principalKey];
        if (prevPrincipal) {
            const principalStackKey = this.principalKey+'Stack';
            let stack = ctx.state[principalStackKey];
            if (!stack) {
                stack = ctx.state[principalStackKey] = [];
            }
            stack.push(prevPrincipal);
        }
        ctx.state[this.principalKey] = principal;
    }

    popPrincipal(ctx) {
        const prevPrincipal = ctx.state[this.principalKey];
        const principalStackKey = this.principalKey+'Stack';
        const stack = ctx.state[principalStackKey];
        ctx.state[this.principalKey] = (stack && stack.pop()) || null;
        return prevPrincipal;
    }

    logout(ctx) {
        this.setPrincipal(ctx, null);
        this.removeCookie(ctx);
    }

    login(ctx, principal) {
        this.setPrincipal(ctx, principal);
        return this.setCookie(ctx, principal);
    }

    /**
     * Get the JWT token if there is a cookie containing a jwt token (the cookie name is controlled by the cookie.name option)
     * @param {*} ctx
     */
    token(ctx) {
        if (ctx.method !== 'POST') {
            ctx.throw(405);
        }
        const reqToken =  ctx.request.header[this.auth.opts.requestTokenHeader];
        if (!reqToken) { // Anti CSRF check for browsers not supporting sameSite cookie attribute
            ctx.throw(403);
        }
        if (reqToken === 'refresh') {
            ctx.state._webappRefreshToken; // force a refresh
        }
        if (ctx.method === 'POST' && ctx.request.header[this.auth.opts.requestTokenHeader] === 'true') {
            try {
                const name = this.auth.cookie && this.auth.cookie.name;
                if (name) {
                    let token = ctx.cookies.get(name);
                    if (token) {
                        const principal = this.auth.jwtLogin(token);
                        if (ctx.state._webappRefreshToken) {
                            // recreate a principal from the user store
                            principal = this.auth.refreshLogin(principal);
                        } // else reuse the same principal
                        token = this.auth.signJWT(principal.toJWT());
                        // reset the cookie expiry time
                        ctx.cookies.set(name, token, this.auth.cookie);
                        ctx.body = token;
                        ctx.response.type = 'text/plain';
                        return;
                    }
                }
            } catch(e) {
                ctx.throw(401, null, {detail: e.message});
            }
        }

        ctx.throw(401);
    }

    /**
     * Like `token` but refetch the user and recreate a fresh token. Usefull to update the token if the user details included in the token
     * were modified in the user store.
     * @param {*} ctx
     */
    refreshMiddleware() {
        return ctx => {
            ctx.state._webappRefreshToken = true;
            return this.token(ctx);
        }
    }

    tokenMiddleware() {
        return this.token.bind(this);
    }

    /**
     * Restore an authenticated session if any (from session cookie or auth headers)
     * @returns a middleware to restore the authenticated session
     */
    authMiddleware(opts = {}) {
        const extract = opts.extractToken || extractToken;
        const jwtAuth = (ctx, next) => {
            let principal;
            const token = extract(ctx, this.auth.cookie && this.auth.cookie.name);
            if (token) {
                try {
                    principal = this.auth.jwtLogin(token);
                } catch (e) {
                    ctx.throw(401, e.message);
                }
            } else if (this.auth.allowAnonymous) {
                // access as anonymous user
                principal = this.auth.anonymous;
            } else {
                // anonymous access is not allowed so we retun 401
                ctx.throw(401);
            }
            this.setPrincipal(ctx, principal);
            return next();
        }
        return jwtAuth;
    }


    loginMiddleware(opts = {}) {
        const usernameKey = opts.username || 'username';
        const passwordKey = opts.password || 'password';
        return async (ctx, next) => {
            if (ctx.method === 'POST') {
                let username, password;
                const body = await ctx.request.body; // the body is loaded on demand
                if (body.isMultipart || body.isForm) {
                    username = body.params[usernameKey];
                    password = body.params[passwordKey];
                } else if (body.isJSON) {
                    username = body.json[usernameKey];
                    password = body.json[passwordKey];
                } else {
                    ctx.throw(415, 'Only supports JSON objects or forms (urlencoded or multipart). Got: '+ctx.header['content-type']);
                }
                if (!username) ctx.throw(400, null, {status: 400, error: 'Username cannot be empty'});
                if (!password) ctx.throw(400, null, {status: 400, error: 'Password cannot be empty'});
                try {
                    const principal = this.auth.passwordLogin(username, password);
                    let token = this.login(ctx, principal);
                    if (!token) {
                        token = thid.auth.signJWT(principal.toJWT());
                    }
                    ctx.body = {
                        principal: principal,
                        token: token
                    };
                } catch (e) {
                    this.logout(ctx);
                    ctx.throw(401);
                }
            }
        }
    }

    logoutMiddleware() {
        return (ctx, next) => {
            this.logout(ctx);
            ctx.response.status = 204;
        }
    }

    oauthMiddleware() {
        return (ctx, next) => {
            //TODO
            return next();
        }
    }
}



module.exports = KoaAuthentication;