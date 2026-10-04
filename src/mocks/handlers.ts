import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import { type AppConfig } from '../app/config/app-config';
import type { SignUpRequest } from '../app/features/auth/data-access/auth-contracts';
import {
  readObject,
  readOptionalString,
  readString,
} from '../app/features/auth/data-access/auth-validation';
import { DemoAccounts } from './fixtures';
import { createTasksMockHandlers } from './tasks-handlers';

export interface MockOptions {
  readonly origin?: string;
  readonly delayMs?: number;
}

function readRegistration(value: unknown): SignUpRequest {
  const body = readObject(value);
  const middleName = readOptionalString(body['middleName']);
  const phone = readOptionalString(body['phone']);
  return {
    firstName: readString(body['firstName']),
    lastName: readString(body['lastName']),
    email: readString(body['email']),
    password: readString(body['password']),
    confirmPassword: readString(body['confirmPassword']),
    ...(middleName === undefined ? {} : { middleName }),
    ...(phone === undefined ? {} : { phone }),
  };
}

export function createMockHandlers(config: AppConfig, options: MockOptions = {}): RequestHandler[] {
  const accounts = new DemoAccounts();
  const base = new URL(config.apiBaseUrl, options.origin ?? location.origin).href.replace(
    /\/$/,
    '',
  );
  const wait = (): Promise<void> => delay(options.delayMs ?? 300);
  const failure = (status: number, message: string) => HttpResponse.json({ message }, { status });
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return [
    http.post(`${base}/auth/login`, async ({ request }) => {
      await wait();
      let emailOrPhone: string;
      let password: string;
      try {
        const body = readObject(await request.json());
        emailOrPhone = readString(body['emailOrPhone']);
        password = readString(body['password']);
      } catch {
        return failure(400, 'Invalid login request');
      }
      const accessToken = accounts.login(emailOrPhone, password);
      return accessToken ? HttpResponse.json({ accessToken }) : failure(401, 'Invalid credentials');
    }),
    http.post(`${base}/auth/sign-up`, async ({ request }) => {
      await wait();
      let body: SignUpRequest;
      try {
        body = readRegistration(await request.json());
      } catch {
        return failure(400, 'Invalid registration request');
      }
      if (
        body.password !== body.confirmPassword ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
      ) {
        return failure(400, 'Invalid registration request');
      }
      const id = accounts.register(body);
      return id === undefined
        ? failure(409, 'Email already registered')
        : HttpResponse.json({ id, status: 'created' }, { status: 201 });
    }),
    http.get(`${base}/profile`, async ({ request }) => {
      await wait();
      const authorization = request.headers.get('Authorization');
      const user = authorization?.startsWith('Bearer ')
        ? accounts.profile(authorization.slice(7))
        : undefined;
      return user ? HttpResponse.json(user) : failure(401, 'Invalid session');
    }),
    ...createTasksMockHandlers({
      baseUrl: base,
      delayMs: options.delayMs ?? 300,
      resolveUserId: (authorization) =>
        authorization?.startsWith('Bearer ')
          ? accounts.profile(authorization.slice(7))?.id
          : undefined,
    }),
    http.all(new RegExp(`^${escapedBase}(?:/.*)?$`), () =>
      failure(501, 'No demo handler for this API request'),
    ),
  ];
}
