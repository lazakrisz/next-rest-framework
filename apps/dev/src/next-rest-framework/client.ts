import { NextRestFramework } from 'next-rest-framework';

export const { defineCatchAllHandler, defineEndpoints } = NextRestFramework({
  localOpenApiSpecPath: 'src/next-rest-framework/openapi.json',
  apiRoutesPath: 'src/pages/api',
  middleware: () => ({ foo: 'foo', bar: 'bar', baz: 'baz' })
});
