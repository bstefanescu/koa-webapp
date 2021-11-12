export = Router;
declare class Router {
    constructor(prefix: any);
    _prefix: any;
    _chain: any[];
    notFoundMessage: any;
    app: any;
    methods(...args: any[]): Router;
    middleware(): any;
    /**
     * Use koa-send to serve static files. The serve middleware will be inserted as a filter.
     * If a request matches a static resource route it will stop the middleware chain and it will either send the file if one is found, either returns a 404.
     * It means that filters after the `serve` filter will no more be called (neither endpoints middleware)
     * If the given root is not absolute it will be resolved against the current working directory.
     * Apart the koa-send options you can use the following options:
     * 1. prefix - default to /. If defined it will only match request paths under this prefix and will exclude the prefix part from the path when matching files in the root directory.
     * 2. excludes - an array of paths to exclude. You can use wildcards to specify entire subtrees. Example:
     *      - `/api/*` will exclude '/api' and all the paths starting with /api/
     *      - `/api/+` will exclude all the paths starting with /api/. '/api' itself won't be excluded.
     * @param {*} root - the root directory to serve from. Default
     * @param {*} opts - options containing koa-send options and local options
     */
    serve(root: any, opts?: any): Router;
    mount(prefix: any): Router;
    use(...args: any[]): Router;
    get(pattern: any, target: any): Router;
    put(pattern: any, target: any): Router;
    del(pattern: any, target: any): Router;
    post(pattern: any, target: any): Router;
    head(pattern: any, target: any): Router;
    options(pattern: any, target: any): Router;
    patch(pattern: any, target: any): Router;
}
