export = KoaAuthentication;
/**
 *
 * To change the key principal property name of the koa context, set the `principalKey` property of a `KoaAuthentication` instance: `koaAuth.principalKey = 'my-principal';`.
 * The default principal property name is 'principal'.
 *
 */
declare class KoaAuthentication {
    constructor(auth: any);
    auth: any;
    principalKey: string;
    get userManager(): any;
    /**
     *
     * @param {*} ctx
     * @param {Principal} principal
     */
    setCookie(ctx: any, principal: Principal): any;
    removeCookie(ctx: any): void;
    getCookie(ctx: any): any;
    setPrincipal(ctx: any, principal: any): void;
    getPrincipal(ctx: any): any;
    pushSuperuser(ctx: any): void;
    pushPrincipal(ctx: any, principal: any): void;
    popPrincipal(ctx: any): any;
    logout(ctx: any): void;
    login(ctx: any, principal: any): any;
    /**
     * Get the JWT token if there is a cookie containing a jwt token (the cookie name is controlled by the cookie.name option)
     * @param {*} ctx
     */
    token(ctx: any, refresh: any): Promise<void>;
    /**
     * Like `token` but refetch the user and recreate a fresh token. Usefull to update the token if the user details included in the token
     * were modified in the user store.
     * @param {*} ctx
     */
    refreshMiddleware(): (ctx: any) => Promise<void>;
    tokenMiddleware(): (ctx: any) => Promise<void>;
    /**
     * Restore an authenticated session if any (from session cookie or auth headers)
     * @returns a middleware to restore the authenticated session
     */
    authMiddleware(opts?: {}): (ctx: any, next: any) => any;
    loginMiddleware(opts?: {}): (ctx: any, next: any) => Promise<void>;
    logoutMiddleware(): (ctx: any, next: any) => void;
}
import Principal = require("./principal");
