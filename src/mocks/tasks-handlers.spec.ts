import { getResponse, type RequestHandler } from 'msw';
import { decodeTask, decodeTasks } from '../app/features/core/tasks/data-access/task-decoders';
import { createMockHandlers } from './handlers';

const origin = 'http://localhost';
const seed = [
  { id: 1, title: 'Review the feature structure', completed: false },
  { id: 2, title: 'Explore NgRx selectors', completed: false },
  { id: 3, title: 'Try updating a task', completed: true },
];
const fresh = () =>
  createMockHandlers({ mode: 'demo', apiBaseUrl: '/api' }, { origin, delayMs: 0 });

async function respond(
  handlers: RequestHandler[],
  path: string,
  token?: string,
  body?: unknown,
  method = 'GET',
): Promise<Response> {
  const response = await getResponse(
    handlers,
    new Request(`${origin}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
  if (!response) throw new Error('Expected an own-API response');
  return response;
}

describe('Per-account task mock API', () => {
  it('lists three seeds, confirms one update and retains the other rows until reload', async () => {
    const handlers = fresh();
    const list = await respond(handlers, '/tasks', 'demo-token');
    expect(list.status).toBe(200);
    expect(decodeTasks(await list.json())).toEqual(seed);
    const saved = await respond(
      handlers,
      '/tasks/1',
      'demo-token',
      { completed: true, userId: 2 },
      'PATCH',
    );
    expect(saved.status).toBe(200);
    expect(decodeTask(await saved.json())).toEqual({ ...seed[0], completed: true });
    expect(decodeTasks(await (await respond(handlers, '/tasks', 'demo-token')).json())).toEqual([
      { ...seed[0], completed: true },
      seed[1],
      seed[2],
    ]);
    expect(decodeTasks(await (await respond(fresh(), '/tasks', 'demo-token')).json())).toEqual(
      seed,
    );
    const active = await respond(handlers, '/tasks/1', 'demo-token', { completed: false }, 'PATCH');
    expect(decodeTask(await active.json()).completed).toBe(false);
  });

  it('rejects missing/invalid sessions for both reads and writes', async () => {
    const handlers = fresh();
    for (const token of [undefined, 'invalid']) {
      expect((await respond(handlers, '/tasks', token)).status).toBe(401);
      expect(
        (await respond(handlers, '/tasks/1', token, { completed: true }, 'PATCH')).status,
      ).toBe(401);
    }
    const response = await getResponse(
      handlers,
      new Request(`${origin}/api/tasks`, { headers: { Authorization: 'Basic demo-token' } }),
    );
    expect(response?.status).toBe(401);
  });

  it('rejects malformed completion bodies/IDs without changing records', async () => {
    const handlers = fresh();
    for (const body of [null, [], {}, { completed: 'true' }, { completed: 1 }]) {
      expect((await respond(handlers, '/tasks/1', 'demo-token', body, 'PATCH')).status).toBe(400);
    }
    const invalidJson = await getResponse(
      handlers,
      new Request(`${origin}/api/tasks/1`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer demo-token', 'Content-Type': 'application/json' },
        body: '{',
      }),
    );
    expect(invalidJson?.status).toBe(400);
    for (const id of ['0', '-1', '1.5', '01', '9007199254740992', '999']) {
      expect(
        (await respond(handlers, `/tasks/${id}`, 'demo-token', { completed: true }, 'PATCH'))
          .status,
      ).toBe(404);
    }
    expect(decodeTasks(await (await respond(handlers, '/tasks', 'demo-token')).json())).toEqual(
      seed,
    );
  });

  it('starts new accounts empty and denies task IDs owned by another user', async () => {
    const handlers = fresh();
    const registration = {
      firstName: 'New',
      lastName: 'User',
      email: 'new@example.test',
      password: 'secret',
      confirmPassword: 'secret',
    };
    expect((await respond(handlers, '/auth/sign-up', undefined, registration, 'POST')).status).toBe(
      201,
    );
    const login = await respond(
      handlers,
      '/auth/login',
      undefined,
      { emailOrPhone: registration.email, password: registration.password },
      'POST',
    );
    expect(await login.json()).toEqual({ accessToken: 'demo-token-2' });
    expect(
      decodeTasks(await (await respond(handlers, '/tasks?userId=1', 'demo-token-2')).json()),
    ).toEqual([]);
    expect(
      (await respond(handlers, '/tasks/1', 'demo-token-2', { completed: true, userId: 1 }, 'PATCH'))
        .status,
    ).toBe(404);
    expect(decodeTasks(await (await respond(handlers, '/tasks', 'demo-token')).json())).toEqual(
      seed,
    );
    expect((await respond(fresh(), '/tasks', 'demo-token-2')).status).toBe(401);
  });

  it('composes before own-API fallback without intercepting unrelated requests', async () => {
    const handlers = fresh();
    expect((await respond(handlers, '/tasks/1', 'demo-token', undefined, 'DELETE')).status).toBe(
      501,
    );
    expect(
      await getResponse(handlers, new Request('https://external.example/api/tasks')),
    ).toBeUndefined();
    expect(await getResponse(handlers, new Request(`${origin}/assets/tasks.json`))).toBeUndefined();
  });
});
