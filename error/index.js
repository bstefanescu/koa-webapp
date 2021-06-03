const path = require('path');
const fs = require('fs');
const statuses = require('statuses');

function readFile(file) {
    try {
        return fs.readFileSync(file).toString();
    } catch(e) {
        return null;
    }
}

function json(data, error, opts) {
    let content;
    if (opts.json) {
        content = opts.json(data, error, opts);
    }
    return JSON.stringify(content ? content : data);
}

function html(data, error, opts) {
    let content;
    if (opts.html) {
        const handlerType = typeof opts.html;
        if (handlerType === 'string') {
            content = readFile(path.resolve(opts.html, data.statusCode+'.html'));
            // use a template engine if needed
            if (content && opts.renderHTML) {
                content = opts.renderHTML(content, {
                    data: data,
                    error: error,
                    opts: opts
                });
            }
        } else if (handlerType === 'function') {
            content = opts.html(data, error, opts);
        }
    }
    if (!content) { // default handler
        const title = data.statusCode + ' ' + data.error;
        const message = data.message ? '<p>'+data.message : '';
        const detail = data.detail ? '<p>'+data.detail : '';
        content = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title></head><body style='padding:20px'><h1>${title}</h1>${message}${detail}</body></html>`;
    };
    return content;
}

function text(data, error, opts) {
    let content;
    if (opts.text) {
        content = opts.text(data, error, opts);
    }
    if (!content) { // default handler
        content = data.statusCode+' '+data.error + '\n\n';
        if (data.message) content += data.message+'\n';
        if (data.detail) content += data.detail+'\n';
    }
    return content;
}

function getContentType(ctx, ctype) {
    let type;
    if (ctype) {
        type = ctx.accepts(ctype);
    }
    if (!type) {
        type = ctx.accepts('html', 'json', 'text');
    }
    return type;
}


/**
 * Allowed options: {
 *  json,
 *  html,
 *  text,
 *  renderHTML
 * }
 * @param {*} opts
 * @returns
 */
module.exports = function errorHandler(opts = {}) {
    const dir = opts.dir;
    // the onerror is default koa onerror modified to output json or html
    return function onerror(err) {
        // don't do anything if there is no error.
        // this allows you to pass `this.onerror`
        // to node-style callbacks.
        if (null == err) return;

        // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
        // See https://github.com/koajs/koa/issues/1466
        // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
        const isNativeError =
        Object.prototype.toString.call(err) === '[object Error]' ||
        err instanceof Error;
        if (!isNativeError) err = new Error(util.format('non-error thrown: %j', err));

        let headerSent = false;
        if (this.headerSent || !this.writable) {
        headerSent = err.headerSent = true;
        }

        // delegate
        this.app.emit('error', err, this);

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
        return;
        }

        const { res } = this;

        // first unset all headers
        /* istanbul ignore else */
        if (typeof res.getHeaderNames === 'function') {
        res.getHeaderNames().forEach(name => res.removeHeader(name));
        } else {
        res._headers = {}; // Node < 7.7
        }

        // then set those specified
        this.set(err.headers);

        // force text/plain
        this.type = 'text';

        let statusCode = err.status || err.statusCode;

        // ENOENT support
        if ('ENOENT' === err.code) statusCode = 404;

        // default to 500
        if ('number' !== typeof statusCode || !statuses[statusCode]) statusCode = 500;


        const code = statuses[statusCode];

        const errorObject = {
            statusCode: statusCode,
            error: code,
        };
        if (err.expose && err.message) errorObject.message = err.message;
        if (err.expose && err.detail) errorObject.detail = err.detail;

        let content;
        switch (getContentType(this, err.ctype)) {
            case 'json': {
                this.type = 'application/json';
                content = json(errorObject, err, opts);
                break;
            }
            case 'html': {
                this.type = 'text/html';
                content = html(errorObject, err, opts);
                break;
            }
            default: { // text
                this.type = 'text/plain';
                content = text(errorObject, err, opts);
                break;
            }
        }

        // respond
        this.status = statusCode;
        this.length = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);
        res.end(content);
    }
}
