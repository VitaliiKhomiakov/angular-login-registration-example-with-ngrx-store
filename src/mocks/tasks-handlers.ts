import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import { DemoTasks } from './tasks-fixtures';

export interface TasksMockContext {
  readonly baseUrl: string;
  readonly delayMs: number;
  readonly resolveUserId: (authorization: string | null) => number | undefined;
}

export function createTasksMockHandlers(context: TasksMockContext): RequestHandler[] {
  const tasks = new DemoTasks();
  const failure = (status: number, message: string) => HttpResponse.json({ message }, { status });

  return [
    http.get(`${context.baseUrl}/tasks`, async ({ request }) => {
      await delay(context.delayMs);
      const userId = context.resolveUserId(request.headers.get('Authorization'));
      return userId === undefined
        ? failure(401, 'Invalid session')
        : HttpResponse.json(tasks.list(userId));
    }),
    http.patch(`${context.baseUrl}/tasks/:id`, async ({ request, params }) => {
      await delay(context.delayMs);
      const userId = context.resolveUserId(request.headers.get('Authorization'));
      if (userId === undefined) return failure(401, 'Invalid session');
      const rawId = params['id'];
      if (
        typeof rawId !== 'string' ||
        !/^[1-9]\d*$/.test(rawId) ||
        !Number.isSafeInteger(Number(rawId))
      ) {
        return failure(404, 'Task not found');
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return failure(400, 'Invalid completion request');
      }
      if (
        typeof body !== 'object' ||
        body === null ||
        Array.isArray(body) ||
        !('completed' in body) ||
        typeof body.completed !== 'boolean'
      ) {
        return failure(400, 'Invalid completion request');
      }
      const task = tasks.setCompleted(userId, Number(rawId), body.completed);
      return task ? HttpResponse.json(task) : failure(404, 'Task not found');
    }),
  ];
}
