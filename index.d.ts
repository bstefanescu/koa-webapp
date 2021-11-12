export = WebApp;
declare class WebApp {
    constructor(opts: any);
    koa: any;
    router: Router;
    auth: AuthService;
    opts: any;
    get defaultOptions(): {
        exitHooks: boolean;
        prefix: string;
        secret: any[];
        notFoundMessage: string;
        apiPrefix: string;
        authPrefix: string;
        servePrefix: string;
        serveExclude: string[];
        serveRoot: string;
        requestTokenHeader: string;
        allowAnonymous: boolean;
        proxy: boolean;
    };
    /**
     * Find an user object (in the user store) given a username or email
     * @param {string} nameOrEmail
     * @abstract
     */
    findUser(nameOrEmail: string): void;
    /**
     * Setup global filterd that are always called
     * @param {Router} router
     * @protected
     */
    protected setupFilters(router: Router): void;
    /**
     * Setup main routes
     * @param {Router} router
     * @protected
     */
    protected setupRoutes(router: Router): void;
    /**
     *
     * @param {Router} apiRouter
     * @param {AuthService} auth
     * @protected
     */
    protected setupApiFilters(apiRouter: Router, auth: AuthService): void;
    /**
     *
     * @param {Router} authRouter
     * @param {AuthService} auth
     */
    setupAuth(authRouter: Router, auth: AuthService): void;
    /**
     * use this to setup koa and your routes
     * @param {Router} router
     * @param {AuthService} auth
     * @protected
     */
    protected setup(): void;
    callback(): any;
    createServer(): any;
    start(port: any, cb: any): Promise<any>;
    server: any;
    stop(): Promise<any> | undefined;
}
declare namespace WebApp {
    export { Resource };
}
import Router = require("./router");
import AuthService = require("./auth");
import Resource = require("./router/resource");
