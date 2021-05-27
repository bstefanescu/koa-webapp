
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
        if (this.auth.cookie) {
            if (principal) {
                const token = this.auth.signJWT(principal.toJWT());
                ctx.cookies.set(this.auth.cookie.name, token, this.auth.cookie);
            } else {
                ctx.cookies.set(this.auth.cookie.name);
            }
        }
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
        this.setCookie(ctx, principal);
    }

    /**
     * Get the JWT token if there is a cookie containing a jwt token (the cookie name is controlled by the cookie.name option)
     * @param {*} ctx
     */
    token(ctx) {
        if (ctx.method === 'POST' && ctx.request.header[this.auth.opts.requestTokenHeader] === 'true') {
            try {
                const name = this.auth.cookie && this.auth.cookie.name;
                if (name) {
                    const token = ctx.cookies[name];
                    if (token) {
                        const principal = this.auth.jwtLogin(token);
                        const token = this.auth.signJWT(principal.toJWT());
                        // reset the cookie expiry time
                        ctx.cookies.set(name, token, this.auth.cookie);
                        ctx.body = token;
                        ctx.response.type = 'text/plain';
                        return;
                    }
                }
            } catch(e) {
                // ignore
            }
        }
        this.ctx.throw(401);
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
                ctx.throw(401, 'No authentication token found');
            }
            this.setPrincipal(ctx, principal);
            return next();
        }
        return jwtAuth;
    }


    loginMiddleware(opts = {}) {
        const username = opts.username || 'username';
        const password = opts.password || 'password';
        return (ctx, next) => {
            // require koa-bodyparser
            const body = ctx.request.body;
            try {
                const principal = this.auth.passwordLogin(body[username], body[password]);
            } catch (e) {
                ctx.throw(401, e.message);
            }
            if (user) {
                this.login(ctx, user);
            } else {
                this.logout(ctx)
            }
            return next();
        }
    }

    logoutMiddleware() {
        return (ctx, next) => {
            this.logout(ctx);
            return next();
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