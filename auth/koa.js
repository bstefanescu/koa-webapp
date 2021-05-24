
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

    setCookie(ctx, principal) {
        if (this.auth.cookie) {
            const token = this.auth.signJWT(principal);
            if (token) {
                ctx.cookies.set(this.auth.cookie.name, token, this.auth.cookie);
            }
        }
    }

    removeCookie(ctx) {
        if (this.auth.cookie) {
            ctx.cookies.set(this.auth.cookie.name);
        }
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
     * Restore an authenticated session if any (from session cookie or auth headers)
     * @returns a middleware to restore the authenticated session
     */
    authMiddleware(opts = {}) {
        const extract = opts.extractToken || extractToken;
        return (ctx, next) => {
            let principal;
            const token = extract(ctx, this.auth.cookie && this.auth.cookie.name);
            if (token) {
                try {
                    principal = this.auth.verifyJWT(token);
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
    }


    loginMiddleware(opts = {}) {
        const username = opts.username || 'username';
        const password = opts.password || 'password';
        return (ctx, next) => {
            // require koa-bodyparser
            const body = ctx.request.body;
            try {
                const user = this.auth.verify(body[username], body[password]);
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