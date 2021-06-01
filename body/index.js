const readRawBody = require('raw-body');
const inflate = require('inflation');
const qs = require('qs');
const formidable = require('formidable');

function parseMultipartBody(koaRequest, opts) {
    const form = formidable(opts.formidable);
    return new Promise((resolve, reject) => {
        form.parse(koaRequest.req, (err, fields, files) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    params: fields,
                    files: files
                });
            }
        });
    });
}

function getRawBodyText(koaRequest, opts) {
    const len = koaRequest.length;
    const encoding = koaRequest.headers['content-encoding'];
    if (len && !encoding) {
        opts.length = len;
    }
    return readRawBody(inflate(koaRequest.req), opts);
}

/**
 * Request body class
 * json
 *
 */
class Body {

    constructor(ctx, type, data, raw) {
        this.ctx = ctx;
        this.type = type;
        this.data = data;
        this.raw = raw;
    }

    assertJSON(statusCode, message) {
        if (this.type !== 'json') {
            this.ctx.throw(statusCode || 415, message);
        }
    }

    assertXML(statusCode, message) {
        if (this.type !== 'xml') {
            this.ctx.throw(statusCode || 415, message);
        }
    }

    /**
     * Assert body type is urlencoded
     * @param {*} statusCode
     * @param {*} message
     */
    assertForm(statusCode, message) {
        if (this.type !== 'form') {
            this.ctx.throw(statusCode || 415, message);
        }
    }

    assertMultipart(statusCode, message) {
        if (this.type !== 'multipart') {
            this.ctx.throw(statusCode || 415, message);
        }
    }

    assertText(statusCode, message) {
        if (this.type !== 'text') {
            this.ctx.throw(statusCode || 415, message);
        }
    }

    /**
     * Assert that body type is either multipart or urlencoded
     * @param {*} statusCode
     * @param {*} message
     */
    assertParams(statusCode, message) {
        if (this.type !== 'form' && this.type !== 'multipart') {
            this.ctx.throw(statusCode || 415, message);
        }
    }

    get text() {
        return this.raw;
    }

    get json() {
        return this.isJSON ? this.data : undefined;
    }

    get xml() {
        return this.isXML ? this.data : undefined;
    }

    get params() {
        switch (this.type) {
            case 'form': return this.data;
            case 'multipart': return this.data.params;
            default: return undefined;
        }
    }

    get files() {
        return this.type === 'multipart' ? this.data.files : undefined;
    }

    get isForm() {
        return this.type === 'form';
    }

    get isJSON() {
        return this.type === 'json';
    }

    get isXML() {
        return this.type === 'xml';
    }

    get isMultipart() {
        return this.type === 'multipart';
    }

    get isText() {
        return this.type === 'text';
    }

}

async function createBody(koaRequest, opts) {
    let type, data, raw;
    if (koaRequest.is('multipart')) {
        data = await parseMultipartBody(koaRequest, opts);
        type = 'multipart';
    } else if (koaRequest.is('urlencoded')) {
        // by default we use qs. You can replace the querystring parser using opts.form
        raw = await getRawBodyText(koaRequest, opts);
        data = opts.form ? opts.form(raw) : qs.parse(raw, opts.formOpts);
        type = 'form';
    } else if (koaRequest.is('json', '+json')) {
        // by default we use JSON.parse. You can replace the json parser using opts.json
        raw = await getRawBodyText(koaRequest, opts);
        data = opts.json ? opts.json(raw) : JSON.parse(raw);
        type = 'json';
    } else if (koaRequest.is('xml', '+xml')) {
        // by default fast-xml-parser is used - to change the parser you should provde an xml parser through opts.xml
        raw = await getRawBodyText(koaRequest, opts);
        data = opts.xml ? opts.xml(raw) : require('fast-xml-parser').parse(raw, opts.xmlOpts);
        type = 'xml';
    } else if (koaRequest.is('text/*')) {
        raw = await getRawBodyText(koaRequest, opts);
        type = 'text';
    } else {
        koaRequest.ctx.throw(500, 'Attempting to read text body from an usupported request content type: '+koaRequest.headers['content-type']);
    }
    return new Body(koaRequest.ctx, type, data, raw);
}

Body.install = (koa, opts={}) => {
    opts.encoding = opts.encoding || 'utf8';
    opts.limit = opts.limit || '1mb';
    Object.defineProperty(koa.request, 'body', {
        get() {
            if (!this._body) {
                this._body = createBody(this, opts);
            }
            return this._body;
        }
    });
}

module.exports = Body;
