# koa-webapp

[![Build Status](https://travis-ci.com/bstefanescu/koa-webapp.svg?branch=main)](https://travis-ci.com/bstefanescu/koa-webapp)
[![codecov](https://codecov.io/gh/bstefanescu/koa-webapp/branch/main/graph/badge.svg?token=X4GB9MUWP2)](https://codecov.io/gh/bstefanescu/koa-webapp)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)


An application model and a set of [koa](https://koajs.com/) middlewares which provides a minimal structure to build nodejs web applications. It is ready to use to serve a Single Application Page. For more complex applications you will need to add custom routes or authentication logic.

Features:

1. **WebApp**  \
    A configurable class defining a web application which automatically configure the right middlewares to create a backend for a Single Application Page.
1. **Router**
    * classic route definitions (similar to [koa-router]())
    * support defining a web resources tree using javascript classes
2. **Authentication**
    * Form based login (generates a JWT)
    * JWT stateless authentication
    * Possibility to integrate OAuth2 login flows using [passportjs](http://www.passportjs.org/), [grant](https://github.com/simov/grant) etc.
3. **Request body**  \
    On demand body support to easily access the content send from the browser. (the body will not be read if a middleware is not accessing it)
4. **Error Handling**  \
    Better error handling then the default koa errors. Automatically convert errors to json or html depending on the browser accepted content types.

You can use any of the provided middlewares directly in **koa** without using the WebApp class, which is a helper to easily configure an application.

## Installing

```
npm install koa-webapp
```

## WebApp

This is a helper class that wraps a koa instance, that can be used to configure a web application.
You do not need to use this class in order to use the middlewares provided by this package.

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

Example:

```javascript
const WebApp = require('koa-webapp');
class MyApp extends WebApp {
    constructor(opts) {
        super(opts);
        // the following code is only for demonstration
        // You can use any database you want to store user accounts
        this.userStore = new UserStore();
    }

/**
     * Get an user (or null if none)
     * You must implement this method.
     * @return the user object or null if no user was found
     */
    findUser(nameOrEmail) {
        return this.userStore.find(nameOrEmail);
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

    get proxy() {
        return false;
    }

    get apiRoot() {
        return MyRoot; // returns a class object which extends WebApp.Resource
    }

    get apiPrefix() {
        return '/api/v1';
    }

    get serveOptions() {

    }

    get authOptions() {

    }

    get routerOptions() {

    }

    /**
     * You can use this property to return a custom error handler.
     * The default is to use the error handler bundled in this package
     */
    get errorHandler() {

    }

    setup() {

    }

}

const app = new MyApp();
app.listen(8080);
```

You can access the `koa` instance using the `koa` property: `app.koa`. Also, the `WebApp` instance can be accessed from the `koa` instance using the `webapp` property: `koa.webapp`.  \
The `WebApp` class provides two methods `callback()` and `listen()` that are shortcuts to the same methods of the embeded `koa` instance.



## Router

## Authentication

## Request Body

## Error Handling
