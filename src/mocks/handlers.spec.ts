import { getResponse, http, HttpResponse } from 'msw';
import { decodeTokens, decodeUser } from '../app/features/auth/data-access/auth-decoders';
import { createMockHandlers } from './handlers';

const config = { mode: 'demo', apiBaseUrl: '/api' } as const;
const origin = 'http://localhost';
const registration = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  password: 'new-password',
  confirmPassword: 'new-password',
};
const request = (path: string, body?: unknown, token?: string): Request =>
  new Request(`${origin}/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe('mock API contracts', () => {
  const freshHandlers = () => createMockHandlers(config, { origin, delayMs: 0 });

  it('authenticates the seed and rejects invalid credentials and tokens', async () => {
    const handlers = freshHandlers();
    const login = await getResponse(
      handlers,
      request('/auth/login', { emailOrPhone: 'demo@example.test', password: 'demo-password' }),
    );
    expect(decodeTokens(await login?.json())).toEqual({ accessToken: 'demo-token' });
    const profile = await getResponse(handlers, request('/profile', undefined, 'demo-token'));
    expect(decodeUser(await profile?.json()).email).toBe('demo@example.test');
    expect(
      (
        await getResponse(
          handlers,
          request('/auth/login', { emailOrPhone: 'demo@example.test', password: 'wrong' }),
        )
      )?.status,
    ).toBe(401);
    expect((await getResponse(handlers, request('/profile', undefined, 'invalid')))?.status).toBe(
      401,
    );
  });

  it('registers, detects duplicates, and resets accounts with fresh handlers', async () => {
    const handlers = freshHandlers();
    expect((await getResponse(handlers, request('/auth/sign-up', registration)))?.status).toBe(201);
    expect((await getResponse(handlers, request('/auth/sign-up', registration)))?.status).toBe(409);
    const login = await getResponse(
      handlers,
      request('/auth/login', { emailOrPhone: registration.email, password: registration.password }),
    );
    const token = decodeTokens(await login?.json()).accessToken;
    const profile = await getResponse(handlers, request('/profile', undefined, token));
    expect(decodeUser(await profile?.json()).firstName).toBe('Ada');
    expect(
      (await getResponse(freshHandlers(), request('/profile', undefined, token)))?.status,
    ).toBe(401);
    expect(
      (
        await getResponse(
          handlers,
          request('/auth/sign-up', {
            ...registration,
            email: 'new@example.test',
            confirmPassword: 'mismatch',
          }),
        )
      )?.status,
    ).toBe(400);
  });

  it('rejects malformed input, diagnoses only own API, and allows external requests/assets', async () => {
    const handlers = freshHandlers();
    expect((await getResponse(handlers, request('/auth/login', null)))?.status).toBe(400);
    expect((await getResponse(handlers, request('/unknown?password=secret')))?.status).toBe(501);
    expect(
      await (await getResponse(handlers, request('/unknown?password=secret')))?.text(),
    ).not.toContain('secret');
    expect(
      await getResponse(handlers, new Request('https://other.example/api/profile')),
    ).toBeUndefined();
    expect(
      await getResponse(handlers, new Request(`${origin}/mockServiceWorker.js`)),
    ).toBeUndefined();
  });

  it('supports test-owned 500, network and malformed response overrides', async () => {
    for (const response of [
      HttpResponse.json({ message: 'Unavailable' }, { status: 500 }),
      HttpResponse.error(),
      HttpResponse.json({ id: 'bad' }),
    ]) {
      const handlers = [http.get(`${origin}/api/profile`, () => response), ...freshHandlers()];
      const actual = await getResponse(handlers, request('/profile', undefined, 'demo-token'));
      expect(actual?.status).toBe(response.status);
      expect(actual?.type).toBe(response.type);
    }
  });
});
