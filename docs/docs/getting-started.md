---
sidebar_position: 2
---

# Getting started

## [Initialize client](#initialize-client)

To use Next REST Framework you need to initialize the client somewhere in your Next.js project. The client exposes all functionality of the framework you will need:

```typescript
// next-rest-framework/client.ts

import { NextRestFramework } from 'next-rest-framework';

export const { defineCatchAllHandler, defineEndpoints } = NextRestFramework();
```

The complete API of the initialized client is the following:

| Name                    | Description                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defineCatchAllHandler` |  A function used to generate your single catch-all API route. Must be used in the root of your API routes folder in the following path `pages/api/[[...next-rest-framework]].ts`. |
| `defineEndpoints`       | Used for all other API routes that you want to use Next REST Framework for. Can also be used in other catch-all API routes.                                                       |
| `getOpenApiSpec`        | A function that exposes the generated OpenAPI spec combined with your own definitions. Useful if you want to e.g. export the OpenAPI spec to a separate file.                     |

## [Initialize catch-all handler](#initialize-catch-all-handler)

To initialize Next REST Framework you need to export and call the `defineCatchAllHandler` function from a root-level [optional catch-all API route](https://nextjs.org/docs/routing/dynamic-routes#optional-catch-all-routes):

```typescript
// pages/api/[[...next-rest-framework]].ts

import { defineCatchAllHandler } from 'next-rest-framework/client';

export default defineCatchAllHandler();
```

This is enough to get you started. By default Next REST Framework gives you three API routes with this configuration:

- `/api`: Swagger UI using the auto-generated OpenAPI spec.
- `/api/openapi.json`: An auto-generated openapi.json document.
- `/api/openapi.yaml`: An auto-generated openapi.yaml document.

All of these are configurable with the [Config options](#config-options) that you can pass for your `NextRestFramework` client. You can also use your existing catch-all logic simply by passing a [Route config](#route-config) to your `defineCatchAllHandler` if you want to use e.g. custom 404 handlers, redirections etc.

## [Add an API Route](#add-an-api-route)

```typescript
// pages/api/todos.ts

import { object, string, number, boolean, array } from 'zod';
import { defineEndpoints } from 'next-rest-framework/client';

const todoSchema = object({
  id: string(),
  name: string(),
  completed: boolean()
});

export default defineEndpoints({
  GET: {
    responses: [
      {
        status: 200,
        contentType: 'application/json',
        schema: object({
          data: array(todoSchema)
        })
      }
    ],
    handler: ({ res }) => {
      // Using any other content type, status code or response data format will lead to TS error.
      res.setHeader('content-type', 'application/json');
      res.status(200).json({
        data: [
          {
            id: 'foo',
            name: 'bar',
            completed: true
          }
        ]
      });
    }
  },
  POST: {
    requestBody: {
      contentType: 'application/json',
      schema: object({
        name: string()
      })
    },
    responses: [
      {
        status: 201,
        contentType: 'application/json',
        schema: object({
          data: todoSchema
        })
      }
    ],
    handler: ({
      res,
      req: {
        body: {
          name // Any other attribute will lead to TS error.
        }
      }
    }) => {
      const todo = createYourTodo(name);
      res.setHeader('content-type', 'application/json');
      res.status(201).json({
        data: todo
      });
    }
  }
});
```

These type-safe endpoints will be now auto-generated to your OpenAPI spec and Swagger UI!

## [Config options](#config-options)

The optional config options allow you to customize Next REST Framework. The following options can be passed as a parameter for your `NextRestFramework` client in an object:

| Name                | Description                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openApiSpec`       | Your custom [OpenAPI Object](https://swagger.io/specification/#openapi-object) that will be merged with the auto-generated spec. Defaults to a minimum config required for the OpenAPI spec generation. |
| `openApiJsonPath`   | Custom path for serving `openapi.json` file. Defaults to `/api/openapi.json`.                                                                                                                           |
| `openApiYamlPath`   | Custom path for serving `openapi.yaml` file. Defaults to `/api/openapi.yaml`.                                                                                                                           |
| `swaggerUiPath`     | Custom path for service Swagger UI. Defaults to `/api`.                                                                                                                                                 |
| `exposeOpenApiSpec` | Setting this to `false` will serve none of the OpenAPI documents neither the Swagger UI. Defaults to `true`.                                                                                            |
| `middleware`        | A global middleware for all of your API routes. See [Global middleware](#global-middleware) for more information.                                                                                       |
| `errorHandler`      | A [Global error handler](#global-error-handler) for all of your API routes. Defaults to a basic error handler logging the errors in non-production mode.                                                |
| `suppressInfo`      | Setting this to `true` will suppress all informational logs from Next REST Framework. Defaults to `false`.                                                                                              |

## [Route config](#route-config)

In addition to your method handlers, `middleware` and `errorHandler`, you can also configure OpenAPI [Path Item Object](https://swagger.io/specification/#path-item-object) parameters for your API route and they will automatically become part of your auto-generated OpenAPI spec The following options can be passed as a parameter for your `defineCatchAllHandler` and `defineEndpoints` in an object:

| Name                                                                | Description                                                                                                                                                         | Required |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `GET \| PUT \| POST \| DELETE \| OPTIONS \| HEAD \| PATCH \| TRACE` | A [Method handler](#method-handlers) object.                                                                                                                        | `true`   |
| `middleware`                                                        |  A [Middleware](#middlewares) function that takes in the return values from your [Global middleware](#global-middleware).                                           | `false`  |
| `errorHandler`                                                      | A [Route error handler](#route-error-handler) for this API route, overriding the [Global error handler](#global-error-handler).                                     | `false`  |
| `$ref`                                                              | A reference to another [Path Item Object](https://swagger.io/specification/#path-item-object).                                                                      | `false`  |
| `description`                                                       | A string description, intended to apply to all operations in this path. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation. | `false`  |
| `servers`                                                           | An array of [Server Objects](https://swagger.io/specification/#server-object).                                                                                      | `false`  |
| `parameters`                                                        | An array of [Parameter objects](#https://swagger.io/specification/#parameter-object) or [Reference objects](https://swagger.io/specification/#reference-object).    | `false`  |

## [Method handlers](#method-handlers)

| Name           | Description                                                                                                                                                                         | Required |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `requestBody`  | A [Request body](#request-body) object.                                                                                                                                             | `false`  |
| `responses`    | An array of [Response objects](#response-object).                                                                                                                                   |  `true`  |
| `middleware`   | A [Middleware](#middlewares) function that takes in the return values from both your [Global middleware](#global-middleware) and [Route middleware](#route-middleware).             |  `false` |
| `handler`      |  Your [Handler](#handler) function that takes in your typed request, response and [Middleware](#middlewares) parameters and contains all of your business logic.                    | `true`   |
| `errorHandler` | A [Method error handler](#method-error-handler) for this method, overriding both the [Global error handler](#global-error-handler) and [Route error handler](#route-error-handler). | `false`  |

### [Request body](#request-body)

The required properties are used for internal type-checking and the optional properties are used for OpenAPI spec generation and come from the OpenAPI [Request Body Object](https://swagger.io/specification/#request-body-object) and [Media Type Object](https://swagger.io/specification/#media-type-object) specification.

| Name          | Description                                                                                                                                                                         | Required |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `contentType` | The content type that all requests must have - requests with no content type or incorrect content type will get an error response.                                                  | `true`   |
| `schema`      | A [Zod](https://github.com/colinhacks/zod) or [Yup](https://github.com/jquense/yup) schema describing the format of the request body.                                               | `true`   |
| `description` |  A brief description of the request body. This could contain examples of use. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.           |  `false` |
| `required`    | Determines if the request body is required in the request. All requests without a body will get an error response when this is set to `true`. Defaults to `false`.                  | `false`  |
| `example`     | An example object matching the `schema`.                                                                                                                                            | `false`  |
| `examples`    | A mapping of [Example Objects](https://swagger.io/specification/#example-object) or [Reference Objects](#https://swagger.io/specification/#reference-object) matching the `schema`. |  `false` |
| `encoding`    | A mapping of [Encoding Objects](https://swagger.io/specification/#encoding-object).                                                                                                 |  `false` |

### [Response object](#response-object)

| Name          | Description                                                                                                                                                                                                  | Required |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `description` | A short description of the response. [CommonMark syntax](https://spec.commonmark.org/) MAY be used for rich text representation.                                                                             |  `true`  |
| `status`      | A possible status code returned by your API route.                                                                                                                                                           | `true`   |
| `contentType` | The content type of the response. Using any other content-type will lead to a TS error.                                                                                                                      | `true`   |
| `schema`      | A [Zod](https://github.com/colinhacks/zod) or [Yup](https://github.com/jquense/yup) schema describing the format of the response data. All response data not matching to the schema will lead to a TS error. |  `true`  |
| `headers`     | A mapping of headers to [Header Objects](https://swagger.io/specification/#header-object) or [Reference Objects](https://swagger.io/specification/#reference-object).                                        | `false`  |
| `links`       |  A mapping of [Link Objects](https://swagger.io/specification/#link-object) or [Reference Objects](https://swagger.io/specification/#reference-object).                                                      | `false`  |

### [Handler](#handler)

The handler function takes care of your actual business logic, supporting both synchronous and asynchronous execution and taking in an object with three strongly typed parameters:

| Name     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `req`    |  A strongly-typed `NextApiRequest` object containing the typed body of your request.                                                                                                                                                                                                                                                                                                                                                                                         |
| `res`    | A strongly-typed `NextApiResponse` object that allows you to use only pre-defined status codes, `Content-Type` headers and response data formats from the current method handler.                                                                                                                                                                                                                                                                                            |
| `params` | An object containing the strongly-typed combined response of your [Global middleware](#global-middleware), [Route middleware](#route-middleware) and [Method middleware](#method-middleware). The parameters can also be overridden in the different middleware layers with the [Method middleware](#method-middleware) taking precedence over the [Route middleware](#route-middleware) and route middleware taking precedence over [Global middleware](#global-middleware) |

## [Middlewares](#middlewares)

The middleware functions can be used for any kind of middleware logic, like adding authentication etc. for your API. In addition, they can be used to add additional typed parameters for your API route handlers. They support both asynchronous and synchronous execution.

```typescript
// A global middleware, route middleware or method middleware.
middleware: () => ({
  foo: 'bar'
});
// A method handler (given that the middleware above is either in the same API route or method, or is a global middleware).
handler: ({
  params: {
    foo // string
  }
}) => {
  // Your logic.
};
```

## [Global middleware](#global-middleware)

The global middleware function takes in an object with two attributes and optionally returns an object of any form:

| Name  | Description                       |
| ----- | --------------------------------- |
| `req` |  A plain `NextApiRequest` object. |
| `res` | A plain `NextApiResponse` object. |

## [Route middleware](#route-middleware)

The route middleware function takes in an object with three attributes and optionally returns an object of any form:

| Name     | Description                                                                      |
| -------- | -------------------------------------------------------------------------------- |
| `req`    |  A plain `NextApiRequest` object.                                                |
| `res`    | A plain `NextApiResponse` object.                                                |
| `params` |  The type of an object returned by your [Global middleware](#global-middleware). |

## [Method middleware](#method-middleware)

The method middleware function takes in an object with three attributes and optionally returns an object of any form:

| Name     | Description                                                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `req`    |  A strongly-typed `NextApiRequest` object containing the typed body of your request.                                                                                              |
| `res`    | A strongly-typed `NextApiResponse` object that allows you to use only pre-defined status codes, `Content-Type` headers and response data formats from the current method handler. |
| `params` |  The type of a combined object returned by both your [Global middleware](#global-middleware) and [Route middleware](#route-middleware).                                           |

## [Error handlers](#error-handlers)

The error handler functions can be used for custom error handling. They support both asynchronous and synchronous execution.

```typescript
// A global error handler, route error handler or method error handler.
errorHandler: ({ req, res, params }) => {
  // Your error handling logic.
};
```

## [Global error handler](#global-error-handler)

The global error handler takes in an object with two attributes:

| Name  | Description                       |
| ----- | --------------------------------- |
| `req` |  A plain `NextApiRequest` object. |
| `res` | A plain `NextApiResponse` object. |

## [Route error handler](#global-error-handler)

Route error handler can be used to override your global error handler. The route error handler takes in an object with three attributes:

| Name     | Description                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `req`    |  A plain `NextApiRequest` object.                                                                                                       |
| `res`    | A plain `NextApiResponse` object.                                                                                                       |
| `params` |  The type of a combined object returned by both your [Global middleware](#global-middleware) and [Route middleware](#route-middleware). |

## [Method error handler](#global-error-handler)

Method error handler can be used to override both your global error handler and route error handler. The method error handler takes in an object with three attributes and optionally returns an object of any form:

| Name     | Description                                                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `req`    |  A strongly-typed `NextApiRequest` object containing the typed body of your request.                                                                                              |
| `res`    | A strongly-typed `NextApiResponse` object that allows you to use only pre-defined status codes, `Content-Type` headers and response data formats from the current method handler. |
| `params` |  The type of a combined object returned by your [Global middleware](#global-middleware), [Route middleware](#route-middleware) and [Method middleware](#method-middleware).       |