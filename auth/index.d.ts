export = AuthService;
declare class AuthService {
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
    constructor(opts?: object);
    opts: any;
    Principal: any;
    secrets: any[];
    allowAnonymous: any;
    jwtSignOpts: any;
    jwtVerifyOpts: any;
    cookie: any;
    koa: KoaAuthentication;
    findUser(name: any): Promise<any>;
    createPrincipal(name: any, userData: any): any;
    /**
     * Login using an username / password.
     * If login is successfull, returns a Principal object, otherwise throws an Error.
     * @throws UserNotFoundError or PasswordMismatchError
     * @param {*} name
     * @param {*} password
     * @returns a principal object
     */
    passwordLogin(name: any, password: any): Promise<any>;
    refreshLogin(principal: any): Promise<any>;
    /**
     * Prform a login given a JWT.
     * If login is usccessfull, returns a Principal object, otherwise throws an Error.
     * @throws if no matching user is found or Error if token validation fails
     * @param {*} token
     * @returns the principal corresponding to the JWT
     */
    jwtLogin(token: any): any;
    /**
     * Verify the given token agaisnt the registered secrets and return the decoded token
     * @param {*} token
     * @throws error if token fails to validate
     * @returns the decoded token on success otherwise throws an error
     */
    verifyJWT(token: any, opts: any): any;
    signJWT(principal: any, opts: any): any;
}
declare namespace AuthService {
    export { USER_NOT_FOUND };
    export { PASSWORD_MISMATCH };
}
import KoaAuthentication = require("./koa.js");
declare const USER_NOT_FOUND: "USER_NOT_FOUND";
declare const PASSWORD_MISMATCH: "PASSWORD_MISMATCH";
