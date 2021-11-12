export = Body;
/**
 * Request body class
 * json
 *
 */
declare class Body {
    constructor(ctx: any, type: any, data: any, raw: any, files: any);
    ctx: any;
    type: any;
    data: any;
    raw: any;
    files: any;
    assertJSON(statusCode: any, message: any): void;
    assertXML(statusCode: any, message: any): void;
    /**
     * Assert body type is urlencoded
     * @param {*} statusCode
     * @param {*} message
     */
    assertForm(statusCode: any, message: any): void;
    assertMultipart(statusCode: any, message: any): void;
    assertText(statusCode: any, message: any): void;
    /**
     * Assert that body type is either multipart or urlencoded
     * @param {*} statusCode
     * @param {*} message
     */
    assertParams(statusCode: any, message: any): void;
    get text(): any;
    get json(): any;
    get xml(): any;
    get params(): any;
    get isForm(): boolean;
    get isJSON(): boolean;
    get isXML(): boolean;
    get isMultipart(): boolean;
    get isText(): boolean;
}
declare namespace Body {
    function install(koa: any, opts?: {}): void;
}
