export = serve;
/**
 * Options:
 *
 * {
 *   root: 'web',
 *   prefix: '/',
 *   exclude: ['/api/*', '/auth/*']
 * }
 *
 * @param {*} root
 * @param {*} opts
 * @returns
 */
declare function serve(root: any, opts?: any): (ctx: any, next: any) => any;
