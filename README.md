# koa-webapp

[![Build Status](https://travis-ci.com/bstefanescu/koa-webapp.svg?branch=main)](https://travis-ci.com/bstefanescu/koa-webapp)


An application model and a set of [koa](https://koajs.com/) middlewares which provides a minimal structure to build nodejs web applications. It is ready to use to serve a Single Application Page. For more complex applications you will need to add custom routes or authentication logic.

Features:

1. **WebApp**  \
    A configurable class defining a web application which automatically configure the right middlewares to create a backend for a Single Application Page.
1. **Router**
    * classic route definitions (in the style of [koa-router]())
    * support defining web resources (i.e. endpoints) through javascript classes
2. **Authentication**
    * Form based login (generates a JWT)
    * JWT stateless authentication
    * Possibility to integrate OAuth2 login flows using [passportjs](http://www.passportjs.org/), [grant](https://github.com/simov/grant) etc.
3. **Request body**  \
    On demand body support to easily access the content send by the browser. (the body will not be read if a middleware is not accessing it)
4. **Error Handling**  \
    Better error handling then the default koa errors. Convert errors to json or html depending on the browser accepted content types.

You can use any of the provided middlewares directly in **koa** without using the WebApp class, which is a helper to easily configure all required middlewares.

## WebApp

## Router

## Authentication

## Request Body

## Error Handling
