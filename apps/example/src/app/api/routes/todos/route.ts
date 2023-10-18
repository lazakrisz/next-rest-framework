import { routeHandler, routeOperation } from 'next-rest-framework';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const TODOS = [
  {
    id: 1,
    name: 'TODO 1',
    completed: false
  }
];

// Example App Router route handler with GET/POST handlers.
const handler = routeHandler({
  GET: routeOperation({
    operationId: 'getTodos',
    tags: ['example-api', 'todos', 'app-router']
  })
    .output([
      {
        status: 200,
        contentType: 'application/json',
        schema: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            completed: z.boolean()
          })
        )
      }
    ])
    .handler(() => {
      return NextResponse.json(TODOS, {
        status: 200
      });
    }),

  POST: routeOperation({
    operationId: 'createTodo',
    tags: ['example-api', 'todos', 'app-router']
  })
    .input({
      contentType: 'application/json',
      body: z.object({
        name: z.string()
      })
    })
    .output([
      {
        status: 201,
        contentType: 'application/json',
        schema: z.string()
      }
    ])
    .handler(async (req) => {
      const { name } = await req.json();
      console.log('Strongly typed TODO name: ', name);

      return NextResponse.json('New TODO created.', {
        status: 201
      });
    })
});

export { handler as GET, handler as POST };
