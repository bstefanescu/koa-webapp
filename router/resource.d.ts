export = Resource;
declare class Resource {
    _init(app: any, pattern: any): void;
    app: any;
    _pattern: any;
    _routes: any[];
    _match(path: any): any;
    _matcher: (path: any) => any;
    /**
     *
     * @param {string} path - the path to match
     * @param {array} visitors - the list of matched resources to visit
     * @param {object} params - the path params
     * @returns
     */
    match(ctx: any, path: string, visitors: any[], params: object): any;
    all(ctx: any, next: any): void;
    dispatch(ctx: any, next: any): any;
}
declare namespace Resource {
    export { resourceMiddleware as middleware };
}
declare function resourceMiddleware(root: any): (ctx: any, next: any) => Promise<any>;
