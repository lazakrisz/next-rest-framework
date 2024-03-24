import { z } from 'zod';
import { TypedNextResponse, route, routeOperation } from '../../src/app-router';
import { DEFAULT_ERRORS, ValidMethod } from '../../src/constants';
import { createMockRouteRequest } from '../utils';
import { NextResponse } from 'next/server';
import { validateSchema } from '../../src/shared';
import { zfd } from 'zod-form-data';

describe('route', () => {
  it.each(Object.values(ValidMethod))(
    'works with HTTP method: %p',
    async (method) => {
      const { req, context } = createMockRouteRequest({
        method
      });

      const data = ['All good!'];

      const getOperation = (method: keyof typeof ValidMethod) =>
        routeOperation({ method })
          .outputs([
            {
              status: 200,
              contentType: 'application/json',
              body: z.array(z.string())
            }
          ])
          .handler(() => NextResponse.json(data));

      const res = await route({
        testGet: getOperation('GET'),
        testPut: getOperation('PUT'),
        testPost: getOperation('POST'),
        testDelete: getOperation('DELETE'),
        testOptions: getOperation('OPTIONS'),
        testHead: getOperation('HEAD'),
        testPatch: getOperation('PATCH')
      })[method](req, context);

      const json = await res?.json();
      expect(json).toEqual(data);
    }
  );

  it('returns error for missing handlers', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.GET
    });

    const res = await route({
      // @ts-expect-error: Intentionally invalid (empty handler).
      test: routeOperation({ method: 'GET' }).handler()
    }).GET(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(501);

    expect(json).toEqual({
      message: DEFAULT_ERRORS.notImplemented
    });

    const res2 = await route({
      // Handler doesn't return anything.
      test: routeOperation({ method: 'GET' }).handler(() => {})
    }).GET(req, context);

    const json2 = await res2?.json();
    expect(res2?.status).toEqual(501);

    expect(json2).toEqual({
      message: DEFAULT_ERRORS.notImplemented
    });
  });

  it('returns error for valid methods with no handlers', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST
    });

    const res = await route({
      test: routeOperation({ method: 'GET' }).handler(() => {})
    }).GET(req, context);

    const json = await res?.json();

    expect(res?.status).toEqual(405);
    expect(res?.headers.get('Allow')).toEqual('GET');

    expect(json).toEqual({
      message: DEFAULT_ERRORS.methodNotAllowed
    });
  });

  it('returns error for invalid request body', async () => {
    const body = {
      foo: 'bar'
    };

    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      body,
      headers: {
        'content-type': 'application/json'
      }
    });

    const schema = z.object({
      foo: z.number()
    });

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({
          contentType: 'application/json',
          body: schema
        })
        .handler(() => {})
    }).POST(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(400);

    const { errors } = validateSchema({ schema, obj: body });

    expect(json).toEqual({
      message: DEFAULT_ERRORS.invalidRequestBody,
      errors
    });
  });

  it('returns error for invalid query parameters', async () => {
    const query = {
      foo: 'bar'
    };

    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      query,
      headers: {
        'content-type': 'application/json'
      }
    });

    const schema = z.object({
      bar: z.string()
    });

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({
          contentType: 'application/json',
          query: schema
        })
        .handler(() => {})
    }).POST(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(400);

    const { errors } = validateSchema({ schema, obj: query });

    expect(json).toEqual({
      message: DEFAULT_ERRORS.invalidQueryParameters,
      errors
    });
  });

  it('works with valid query parameters', async () => {
    const query = {
      foo: 'bar'
    };

    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      query,
      headers: {
        'content-type': 'application/json'
      }
    });

    const schema = z.object({
      foo: z.string()
    });

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({
          contentType: 'application/json',
          query: schema
        })
        .outputs([
          {
            status: 200,
            contentType: 'application/json',
            body: z.object({
              foo: z.string()
            })
          }
        ])
        .handler((req) => {
          const foo = req.nextUrl.searchParams.get('foo') ?? '';
          return TypedNextResponse.json({ foo });
        })
    }).POST(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(200);

    expect(json).toEqual({
      foo: 'bar'
    });
  });

  it('returns error for invalid content-type', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      body: {
        foo: 'bar'
      },
      headers: {
        'content-type': 'application/xml'
      }
    });

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({
          contentType: 'application/json',
          body: z.object({
            foo: z.string()
          })
        })
        .handler(() => {})
    }).POST(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(415);

    expect(json).toEqual({
      message: DEFAULT_ERRORS.invalidMediaType
    });
  });

  it('works with application/json', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      body: {
        foo: 'bar'
      },
      headers: {
        'content-type': 'application/json'
      }
    });

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({
          contentType: 'application/json',
          body: z.object({
            foo: z.string()
          })
        })
        .outputs([
          {
            status: 201,
            contentType: 'application/json',
            body: z.object({
              foo: z.string()
            })
          }
        ])
        .handler(async (req) => {
          const { foo } = await req.json();
          return NextResponse.json({ foo });
        })
    }).POST(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(200);
    expect(json).toEqual({ foo: 'bar' });
  });

  it('works with application/x-www-form-urlencoded', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      body: new URLSearchParams({
        foo: 'bar',
        baz: 'qux'
      }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    });

    const schema = z.object({
      foo: z.string(),
      bar: z.string().optional(),
      baz: z.string()
    });

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({
          contentType: 'application/x-www-form-urlencoded',
          body: zfd.formData(schema)
        })
        .outputs([
          {
            status: 200,
            contentType: 'application/json',
            body: schema
          }
        ])
        .handler(async (req) => {
          const formData = await req.formData();

          return TypedNextResponse.json({
            foo: formData.get('foo'),
            bar: formData.get('bar'),
            baz: formData.get('baz')
          });
        })
    }).POST(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(200);

    expect(json).toEqual({
      foo: 'bar',
      bar: null,
      baz: 'qux'
    });
  });

  it('works with multipart/form-data', async () => {
    const body = new FormData();
    body.append('foo', 'bar');
    body.append('baz', 'qux');

    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      body
    });

    const schema = z.object({
      foo: z.string(),
      bar: z.string().optional(),
      baz: z.string()
    });

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({
          contentType: 'multipart/form-data',
          body: zfd.formData(schema)
        })
        .outputs([
          {
            status: 200,
            contentType: 'application/json',
            body: schema
          }
        ])
        .handler(async (req) => {
          const formData = await req.formData();

          return TypedNextResponse.json({
            foo: formData.get('foo'),
            bar: formData.get('bar'),
            baz: formData.get('baz')
          });
        })
    }).POST(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(200);

    expect(json).toEqual({
      foo: 'bar',
      bar: null,
      baz: 'qux'
    });
  });

  it('returns a default error response and logs the error', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.GET
    });

    console.error = jest.fn();

    const res = await route({
      test: routeOperation({ method: 'GET' }).handler(() => {
        throw Error('Something went wrong');
      })
    }).GET(req, context);

    const json = await res?.json();

    expect(json).toEqual({
      message: DEFAULT_ERRORS.unexpectedError
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Something went wrong')
    );
  });

  it('executes middleware before validating input', async () => {
    const body = {
      foo: 'bar'
    };

    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      body,
      headers: {
        'content-type': 'application/json'
      }
    });

    const schema = z.object({
      foo: z.number()
    });

    console.log = jest.fn();

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({
          contentType: 'application/json',
          body: schema
        })
        .middleware(() => {
          console.log('foo');
        })
        .handler(() => {})
    }).POST(req, context);

    expect(console.log).toHaveBeenCalledWith('foo');

    const json = await res?.json();
    expect(res?.status).toEqual(400);

    const { errors } = validateSchema({ schema, obj: body });

    expect(json).toEqual({
      message: DEFAULT_ERRORS.invalidRequestBody,
      errors
    });
  });

  it('does not execute handler if middleware returns an HTTP response', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.GET
    });

    console.log = jest.fn();

    const res = await route({
      test: routeOperation({ method: 'GET' })
        .middleware(() => {
          return NextResponse.json({ foo: 'bar' }, { status: 200 });
        })
        .handler(() => {
          console.log('foo');
        })
    }).GET(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(200);

    expect(json).toEqual({
      foo: 'bar'
    });

    expect(console.log).not.toHaveBeenCalled();
  });

  it('passes data between middleware and handler', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.POST,
      body: { foo: 'bar' },
      headers: {
        'content-type': 'application/json'
      }
    });

    console.log = jest.fn();

    const res = await route({
      test: routeOperation({ method: 'POST' })
        .input({ body: z.object({ foo: z.string() }) })
        .middleware(async (req) => {
          const body = await req.json();
          console.log(body);
          return { bar: 'baz' };
        })
        .handler(async (req, _ctx, options) => {
          const body = await req.json();
          console.log(body);
          console.log(options);
          return NextResponse.json(options);
        })
    }).POST(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(200);

    expect(json).toEqual({
      bar: 'baz'
    });

    expect(console.log).toHaveBeenNthCalledWith(1, { foo: 'bar' });
    expect(console.log).toHaveBeenNthCalledWith(2, { foo: 'bar' });
    expect(console.log).toHaveBeenNthCalledWith(3, { bar: 'baz' });
  });

  it('allows chaining three middlewares', async () => {
    const { req, context } = createMockRouteRequest({
      method: ValidMethod.GET
    });

    console.log = jest.fn();

    const res = await route({
      test: routeOperation({ method: 'GET' })
        .middleware(() => {
          console.log('foo');
          return { foo: 'bar' };
        })
        .middleware((_req, _ctx, options) => {
          console.log('bar');
          return { ...options, bar: 'baz' };
        })
        .middleware((_req, _ctx, options) => {
          console.log('baz');
          return { ...options, baz: 'qux' };
        })
        .handler((_req, _ctx, options) => {
          console.log('handler');
          return NextResponse.json(options);
        })
    }).GET(req, context);

    const json = await res?.json();
    expect(res?.status).toEqual(200);

    expect(json).toEqual({
      foo: 'bar',
      bar: 'baz',
      baz: 'qux'
    });

    expect(console.log).toHaveBeenCalledWith('foo');
    expect(console.log).toHaveBeenCalledWith('bar');
    expect(console.log).toHaveBeenCalledWith('baz');
    expect(console.log).toHaveBeenCalledWith('handler');
  });
});