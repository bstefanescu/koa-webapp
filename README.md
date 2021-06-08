# koa-webapp

[![Build Status](https://travis-ci.com/bstefanescu/koa-webapp.svg?branch=main)](https://travis-ci.com/bstefanescu/koa-webapp)
[![codecov](https://codecov.io/gh/bstefanescu/koa-webapp/branch/main/graph/badge.svg?token=X4GB9MUWP2)](https://codecov.io/gh/bstefanescu/koa-webapp)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/koa-webapp)](https://www.npmjs.com/package/koa-webapp)


An application model and a set of [koa](https://koajs.com/) middlewares which provides a minimal structure to build nodejs web applications. It is ready to be use and serve regular web applications using the default configuration. For more complex applications you will need to add custom routes or a different authentication logic.

Features:

1. **WebApp**  \
    A configurable class defining a web application. Embeds a koa app instance and provide configuration getters to configure the application. It is also the place where you should initialize and store the global (i.e. singleton) services making up your application.
1. **Router**  \
    A koa router middleware providing:
    * classic route definitions with sub-routers support (similar to [koa-router]())
    * support defining a web resources tree by extending the WebApp.Resource class (inspired from JAX-RS Java standard).
2. **Authentication**  \
    A set of koa middlewares providing:
    * Form based login (generates a JWT)
    * JWT stateless authentication
    * Possibility to integrate OAuth2 login flows using [passportjs](http://www.passportjs.org/), [grant](https://github.com/simov/grant) etc.
3. **Request body**  \
    On demand body support to easily access the content send from the browser. (the body will not be read if a middleware is not accessing it)
4. **Error Handling**  \
    Better error handling than the default koa errors. Automatically convert errors to json or html depending on the browser accepted content types.

You can use any of the provided middlewares directly in **koa** without using the WebApp class, which is a helper to easily configure an application.

## Installing

```
npm install koa-webapp
```

## WebApp

A configurable class defining a web application. Embeds a koa app instance and provide configuration getters to configure the application. It is also the place where you should initialize and store the global (i.e. singleton) services making up your application.

The web app instance will be available to all `Resource` objects through the `app` property, so you can easily access the global services. Also, the web app instance will be aavilable on the koa instance as the `webapp` property so you can access the web app from any middleware.

To configure the application you will need to extend the base WebApp class and to define some methods and / or getters. There is only one method that you **must define**: `findUser(emailOrName)` which is used to retrieve an user account given its name or email. If no user is found you must return a falsy value (e.g. null). This method will be used to login users.
The returned User object may define the following fields:

```
    User {
        id, // the user ID
        email, // the user email
        nickname, // a name to be displayed in UI
        role, // a string to be used by your permission system
        groups // an array of group names to be used by your permission system
    }
```

All these fields are optional and are used to fill the `Principal` object which will be created when an user successfully login. The `Principal` object will be available to the middlewares and also will be sent to the client application in the form of an JWT token.

It is up to you how you use the provided information to check the user permissions.

### Example

```javascript
const WebApp = require('koa-webapp');
class MyApp extends WebApp {
    constructor() {
        super(opts);
    }

    // initialize services in the init method. It will be called before configuring the web app.
    init() {
        // the following code is only for demonstration
        // You can use any database you want to store user accounts
        this.userStore = new UserStore();
    }

    /**
     * Get an user given its name or null if none
     * You must implement this method.
     * @return the user object or null if no user was found
     */
    findUser(nameOrEmail) {
        return this.userStore.find(nameOrEmail);
    }

    // Modify the default confioguration by overwriting the corresponding getters

    get allowAnonymous() {
        return true;
    }

    /**
     * Get one or more secrets to be used to sign JWT tokens.
     * The defaukt is to generate a new secret each time you create an application.
     * This is acceptable for tests but you may want to persists the secrets, to avoid invalidating existing tokens if the web server is restarted.
     * @return a secret or an array of secrets
     */
    get secret() {
        return 'my secret'; // you can also return an array of secrets.
    }

    get apiRoot() {
        return MyRoot; // returns a class object which extends WebApp.Resource
    }

}

const app = new MyApp();
app.listen(8080);
```

You can access the `koa` instance using the `koa` property: `app.koa`. Also, the `WebApp` instance can be accessed from the `koa` instance using the `webapp` property: `koa.webapp`.  \
The `WebApp` class provides two methods `callback()` and `listen()` that are shortcuts to the same methods of the embeded `koa` instance.

### Properties:

* **koa** - the embeded instance of koa.
* **router** - the main router mounted in '/'
* **auth** - the authentication service instance.

### Configuration Properties

* **proxy** - property passed to koa. See `koa.proxy`.
* **prefix** - the prefix to be used to mount the main router. Defaults to '/'
* **secret** - a string or array of string to be used as the secret(s) when signing and verifying JWTs.
* **notFoundMessage** - message to be used for the 404 error when no matching resource is found by the router. Defaults to `"Resource not found"`
* **serveRoot** - the root directory to use to serve static files. Defaults to `${process.cwd()/web`
* **servePrefix** - the prefix to remove when mapping URL paths to files inside `serveRoot`. Defaults to `/`
* **serveExclude** - An array of prefix and suffix patterns to exclude when serving static files. Defaults to `['/api/*', '/auth/*']`. The wildcard character `*` is similar to `**` in glob expressions.
* **apiPrefix** - the prefix to use for the root API resource. Defaults to `/api`.
* **apiRoot** - the root API resource class. Defaults to `null`. If not specified no API resource router will be mounted in `/api`.
* **authPrefix** - the prefix to be used for the authentication endpoints. Defaults to `/auth`
* **secret** - a secret or array of secrets to be used . By default a single secret string is generated when appplication is instantiated. This means the secret will change after a server restart so all the issued JWTs will be invalid. You must define this getter if you want to use a mechanism to persist secrets.
* **requestTokenHeader** - the header name that must be used to request a JWT token from the secure authorization cookie. Defaults to `x-koa-webapp-request-token`.
* **allowAnonymous** - if `true` un-authenticated users will be able to access the protected resources (e.g. the API resources). Defaults to `false`. This can be usefull to let un-authenticated users to ccess the application in read only mode.
* **authCookie** - can be a string or an object containing options for the authorization cookie passed to `koa.cookies`. If you only want to change the cookie name you can return a string with that name. If you return an object with cookie options you can also change the cookie name by including a name property in the returned object. The default value is:

```json
{
    "name": "koa-webapp-auth",
    "path": "/auth/token",
    "httpOnly": true,
    "sameSite": "strict",
    "secure": true,
    "overwrite": true
}
```
* **jwtSignOpts** - options passed to `jwtwebtoken.sign()`. Defauilts to `udnefined`. You can use this to define options like issuer, audience etc when creating JWT tokens.
* **jwtVerifyOpts** - options passed to `jwtwebtoken.verify()`. Defauilts to `udnefined`
* **bodyOptions** - options passed to the body parser. Defaults to `undefined`. See the Request Body section for more details
* **errorHandlerOptions** - options passed to the error handler. Defaults to `undefined`. See the Error handling section for details.

### Methods

* **findUser(nameorEmail)** - an absract method used to find users given a login name. This is the only method you **must** define when creating a web application.
* **listen()** - shortcut to koa listen method
* **callback()** - shortcut to koa callback method
* **setup()** - setup the application routes. You can overwrite it to add custom routes or completely redefine the application layout.
* **setupFilters(router)** - Setup middlewares invoked at the begining before doing any resource matching. By default it does nothing.
* **setupApiFilters(apiRouter, auth)** - setup additional middlewares to be called before matching API resources. By default it adds a middleware that protect the access to the api router resources by checking the `Authorization` header for a JWT bearer token.
* **setupRoutes(router)** - add additional routes to the main router. By default it does nothing.

### Default routes

By default (as you can see in the default values above) the `WebApp` resources will be exposed as follows:

```
/
    ... static files ...
    /api/v1 -> the API resource root
    /auth   -> the auth endpoints root
```
Thus, any resource not inside `/api` nor `/auth` will be considered as a static resource and will be mapped to files in the `${process.cwd()}/web` directory.

The resources inside `/api` are protected by the `auth.koa.authMiddleware` that checks the Authorization header for a JWT bearer token.

In `/auth` there are the folloing endpoints:
* `/auth/login` - form based login. Accepts `POST`. When an user logs in, a sameSite, httpOnly andsecure cookie containing the JWT token will be created for the path `/auth/token`. This way the JWT is securely stored in a sameSite cookie and can be retrieved from the client by POSTing a request to `/auth/token`.
* `/auth/logout`- logout endpoint. Accepts `POST` or `GET`.
* `/auth/token` - return the current token if any was set by a login in the auth cookie. This endpoint must be called using a custom header `x-koa-webapp-request-token: true` to avoid CSRF attacks on browsers not supporting sameSite cookie attributes. Accepts `POST`.
* `/auth/refresh` - same as `/auth/token` but force a token refresh (i.e. the user data will be fetched from the database to update the JWT content). This is usefull when the user role or groups are changed on the server - this way you can refetch an updated token using the latest user information. You can also make a refresh by POSTing to `/auth/token` and using `x-koa-webapp-request-token: refresh`. Accepts `POST`.

## The Resource class

The router supports to types of bindings:

1. Classic bindings when you bind a path pattern to a middleware and optionally an HTTP method. Example:

```javascript
router = new Router('/');
router.use((ctx, next) => {
    ctx.body = 'hello!';
    return next();
});
router.use('GET', (ctx, next) => {
    ctx.body = 'hello!';
    return next();
});
router.get((ctx, next) => {
    ctx.body = 'hello!';
    return next();
})
koa.use(router.middleware());
```

The following methods are available: `options()`, `head()`, `get()`, `post()`, `put()`, `del()`, `patch()`. If you need to map more HTTP headers to router methods just call the router `methods` function with the method to add:

```javascript
router.methods('trace', 'connect');
```

You can also use sub-routers to group your endpoints as follows:

```javascript
const subRouter = router.mount('/some-prefix');
subRouter.use(ctx => { ctx.body = 'hello' });
```

**Note** it is recocomended to use as many sub router as possible to group your endpoints. This may improve performance when having tens of path mappings. When putting all bindings in a router to match the last binding you need to test all the defined bindings. When arranging bindings in sub-routers less tests will have to be done to match the last registered endpoint.

2. Tree like resource bindings.

This routing strategy is inspired from the JAX-RS java standard.

When binding Resource objects you can define the bindings in a tree like manner. Each resource is a sub router and can be mounted in a parent resource or in a regular router.
Resources are defined using javascript classes extending the WebApp.Resource base class:

The `get`, `head`, `options`, `post`, `put`, `del`, `patch` methods of a resource will be automatically bound to the corresponding HTTP method and to the path of the resource.

**Note** that a resource method is an end point of the request. It cannot invoke `next()` to call the next middleware. In fact `next` is not exposed at all to resource methods. If a request matched a root resource but no exact match is found inside that root then a 404 is thrown and the remaining middlewares (after the root resource) will not be tested for a match.

A resource may define a special method `visit(ctx)` that will be called before the next resource (down in the tree is visited). You can implement this way permissions checks on sub-trees.

```javascript

class MyApp extends WebApp {
    findUser(name) {
        // do something
    }

    get apiRoot() {
        return Root;
    }
}

class Root extends WebApp.Resource {

    get(ctx) {
        ctx.body = hello;
    }

    // setup routes
    setup(router) {
        // this will match all resources rooted in /users like /users or /users/john
        router.use('/users', Users);
    }
}

class Users extends WebApp.Resource {

    post(ctx) {
        // create an user
    }

    get(ctx) {
        // list users
    }

    // setup routes
    setup(router) {
        router.use('/:userId', User);
    }
}

// THis is a leaf resource no other resources are defined inside setup
class User extends WebApp.Resource {

    get(ctx) {
        // get the user
    }

    put(ctx) {
        // update the user
    }

    del(ctx) {
        // delete the user
    }

    upload(ctx) {
        // upload user picture
    }

    // setup routes - we only define a local route bound to the upload method.
    setup(router) {
        router.post('/upload', this.upload);
    }
}
```
Resource instances provides a property `app` which will point to the WebApp instance they belong to be able to easily access global application services.

Resource patterns cannot end with `*`, `+` or `?`, since they are already using prefix matching.

You can look in tests to see more examples of resources.

## Accessing the authenticated Principal in a request

To implement security check you need to access the authenticated user. An authenticated user is stored in `ctx.state.principal` in the form of a `Principal` object. The principal hold some limited information about the user it refer to like for examples the user role and groups that are usefull when making security checks.

Let's write a simple example: when a request enters a resource named ProtectedWorkspace we will prohibit access to users not having the 'manager' role

```javascript
class ProtectedWorkspace extends WebApp.Resource {
    visit(ctx) {
        if (ctx.state.principal.role !== 'manager') {
            ctx.throw(403);
        }
    }

    get(ctx) {
        // get the list of resources in that workspace
        // users not havin the manager role will never get here sicne visit is called just as the
        // request matched the resource and before additional dispatching is done
    }
}
```

**Note** When anonymous access in on (i.e. `WebApp.allowAnonymous` is true) then a special principal instance is put in the ctx.state.principal property. A principal which `isVirtual` and `isAnonymous` properties are true.

There is another type of virtual principal - the admin principal which has any permission. This principal can only be set to ctx.state.principal explicitly from the code.

## Consuming the request body

To consume the request body (if any) you should read the ctx.request.body property (thanks to the body middleware). This property is promise so you usually need to use the `await` keyword:

```javascript

class MyResource extends WebApp.Resource {
    async post(ctx) {
        const body = await ctx.request.body;
        //...
    }
}
```
You can access the body content either with body.data, body.json, body.xml, body.text, body.params and body.files. To access the raw content use body.raw (not avaiulable for multipart content).
* body.raw is set if the content type is not multipart
* body.params are set only for urlencoded or multipart content.
* body.files is set only for multipart content
* body.json is set only for json content
* body.xml is set only for xml content
* body.text is an alais for body.raw
* body.data is the same as body.json (if a json) or as bodu.xml (if an xml) or as body.params if a multipart or urlencoded content.


**Note** that the body is only consumed on demand (i.e. if you read the `ctx.request.body` property)

### Returning errors to the client

To return an error simple use the `ctx.throw()` method. The error handler will take care to write the error as a JSON or as an HTML content depending on the Accept headers.

You can specify a custom message and an additional 'detail' field for more details abotu the error. Example:

```javascript
ctx.throw(500, 'Server Error', {detail: 'bla bla'});
```

You can also, customize the HTML error pages just return the following configuration from the `WebApp.errorHandlerOptions`:

```javascript
class MyApp extends WebApp {
    get errorHandlerOptions() {
        return {
            html: 'error_directory'
        }
    }
}
```

where `error_directory` is a path to a directory containing HTML error files named using the HTTP status code. Example: `404.html`, `500.html` etc.
If the HTML file is not found for a given status code then the default HTML is used.

Ypu can also specify a function for the `html` property, in which case it will be invoked with the error to return some HTML content.

## The authentication flow

Let's look in the default authentication model proposed by WebApp.

1. The client POST a `username` and a `password` parameters to `/auth/login`. The login endpoint accepts either a JSON, a urlencoded form or a multipart form. (the username should be any type of user identifier like an email or username)
2. The server lookup the User account using `WebApp.findUser(username)`. If no account is found 401 is returned.
3. If the user is found its password is checked against the posted password. If the password doesn't match 401 is returned
4. If the password match, a `Principal` object is created from the user data, a JWT token is generated and signed and a sameSite secure cookie is created to store the JWT.
5. The endpoint retunrs a JSON object: `{ principal, token }`
6. The client either use the received token, either redirects to the application main page which must make a POST request to the `/auth/token` endpoint to obtain the JWT generated earlier. This endpoint is protected against CSRF attacks by using a sameSite strict cookie and an additional custom header (for browsers that doesn't support the sameSite cookie attribute).
7. The next time the user enters the application page, the application will ask for the JWT topken to the `/auth/token` endpoint. If the cookie token still exists then it will send back the token otheriwse it return a 401 and the client redirect the user to the login page.

You can modify as you want the flow (by overwriting the `WebApp.setup()` method). Or you may integrate other logins such OAuth2 logins by copying the logic from the `/auth/login` endpoint (see loginMiddleware in auth/koa.js)

## Development configuration

When developing you may not use https and thus the sameSite cookies will not work. Also, you may want to anonymously access to your application, so the following config may help you:

```javascript
const WebApp = require('koa-webapp');
class MyApp extends WebApp {
    get allowAnonymous() {
        return true;
    }

    get authCookie() {
        return {
            sameSite: false,
            secure: false
        }
    }
}
```
