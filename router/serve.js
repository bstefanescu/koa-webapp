/*
* Serve static files
*/
const path = require('path');
const send = require('koa-send');
const compose = require('koa-compose');
const { createSimpleMatcher } = require('./matchers.js');

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
function serve(root, opts = {}) {
    if (!root) {
        root = process.cwd();
    } else {
        root = path.resolve(root);
    }
    root = path.normalize(root);

    let prefixWithSlash, prefix = opts.prefix;
    if (prefix && prefix.endsWith('/')) {
        prefixWithSlash = prefix;
        prefix = prefix.substring(0, prefix.length-1);
    } else if (prefix) {
        prefixWithSlash = prefix + '/';
    }
    const rebaseOffset = prefix ? prefix.length : 0;

    const sendOpts = Object.assign({}, opts, {root: root});
    if (!opts.index && opts.index !== false) {
        sendOpts.index = 'index.html';
    }

    const exclude = opts.exclude ? opts.exclude.map(pattern => createSimpleMatcher(pattern)) : null;

    const match = (ctx) => {
        // only accept GET and HEAD
        if (ctx.method !== 'GET' && ctx.method !== 'HEAD') return false;
        if (prefix && !(ctx.path.startsWith(prefixWithSlash) || ctx.path === prefix)) return false;
        if (exclude) {
            for (const excl of exclude) {
                if (excl(ctx.path)) return false;
            }
        }
        return true;
    }

    let sendMiddleware = async (ctx, next) => {
        // we don't call next if the request matches -> either we find the resource either we return a 404
        try {
            await send(ctx,
                (rebaseOffset > 0 ? ctx.path.substring(rebaseOffset) : ctx.path) || '.',
                sendOpts);
        } catch (e) {
            if (e.code === 'ENOENT') {
                ctx.throw(404, 'File not found: '+ctx.path);
            } else {
                ctx.throw(500, 'Failed to fetch file: '+ctx.path);
            }
        }
    };

    if (opts.filters && opts.filters.length > 0) {
        sendMiddleware = compose(opts.filters.concat(sendMiddleware));
    }

    let serveMiddleware = (ctx, next) => {
        if (match(ctx)) {
            return sendMiddleware(ctx, next);
        } else {
            return next();
        }
    }

    return serveMiddleware;
}

module.exports = serve;
