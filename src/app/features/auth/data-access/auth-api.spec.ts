import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../config/app-config';
import { AuthApi } from './auth-api';
import { ApiContractError } from './auth-decoders';
import { apiInterceptor } from '../../../http/api-interceptor';
import { apiRequestContext } from '../../../http/api-request-context';
import { SessionTokenStorage } from '../../../session/session-token-storage';

describe('Auth API and transport boundary', () => {
  let backend: HttpTestingController;
  let api: AuthApi;
  const storage = { read: vi.fn<() => string | null>() };

  beforeEach(() => {
    storage.read.mockReturnValue('demo-token');
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_CONFIG, useValue: { mode: 'demo', apiBaseUrl: '/api' } },
        { provide: SessionTokenStorage, useValue: storage },
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    api = TestBed.inject(AuthApi);
  });
  afterEach(() => backend.verify());

  it('sends login credentials without authorization and decodes the response', async () => {
    const credentials = { emailOrPhone: 'demo@example.test', password: 'demo-password' };
    const result = firstValueFrom(api.login(credentials));
    const request = backend.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ accessToken: 'token', ignored: true });
    await expect(result).resolves.toEqual({ accessToken: 'token' });
  });

  it('sends signup DTO without a token', async () => {
    const payload = {
      firstName: 'A',
      lastName: 'B',
      email: 'a@example.test',
      password: 'secret',
      confirmPassword: 'secret',
    };
    const result = firstValueFrom(api.signUp(payload));
    const request = backend.expectOne('/api/auth/sign-up');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ id: 2, status: 'created' });
    await expect(result).resolves.toEqual({ id: 2, status: 'created' });
  });

  it('attaches the session token to profile and rejects a malformed response', async () => {
    const result = firstValueFrom(api.loadProfile());
    const assertion = expect(result).rejects.toThrow(ApiContractError);
    const request = backend.expectOne('/api/profile');
    expect(request.request.headers.get('Authorization')).toBe('Bearer demo-token');
    request.flush({ id: 1, password: 'must not leak' });
    await assertion;
  });

  it('omits empty tokens and leaves other requests and body headers alone', async () => {
    storage.read.mockReturnValue(null);
    const client = TestBed.inject(HttpClient);
    const profile = firstValueFrom(
      client.get('/profile', {
        context: apiRequestContext('authenticated'),
      }),
    );
    const request = backend.expectOne('/api/profile');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await profile;
    for (const url of [
      '/assets/config.json',
      'https://outside.example/profile',
      '/profile-extra',
    ]) {
      const response = firstValueFrom(client.post(url, new FormData()));
      const untouched = backend.expectOne(url);
      expect(untouched.request.headers.has('Authorization')).toBe(false);
      expect(untouched.request.headers.has('Content-Type')).toBe(false);
      untouched.flush({});
      await response;
    }
  });

  it('keeps HTTP failures observable and allows another request', async () => {
    const failed = firstValueFrom(api.login({ emailOrPhone: 'x', password: 'wrong' }));
    const assertion = expect(failed).rejects.toMatchObject({ status: 401 });
    backend.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    await assertion;
    const retry = firstValueFrom(api.login({ emailOrPhone: 'x', password: 'right' }));
    backend.expectOne('/api/auth/login').flush({ accessToken: 'ok' });
    await expect(retry).resolves.toEqual({ accessToken: 'ok' });
  });
});
