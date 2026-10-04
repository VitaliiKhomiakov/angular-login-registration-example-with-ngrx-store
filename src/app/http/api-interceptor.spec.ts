import { HttpClient, HttpParams, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, retry } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { SessionTokenStorage } from '../session/session-token-storage';
import { apiInterceptor } from './api-interceptor';
import { apiRequestContext } from './api-request-context';

describe.each([
  { mode: 'demo', apiBaseUrl: '/api' },
  { mode: 'remote', apiBaseUrl: 'https://backend.example/api/v2' },
] as const)('Explicit API request policy in $mode mode', (config) => {
  let client: HttpClient;
  let backend: HttpTestingController;
  const storage = { read: vi.fn<() => string | null>() };

  beforeEach(() => {
    storage.read.mockReset().mockReturnValue('session-token');
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: SessionTokenStorage, useValue: storage },
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());

  it('supports a new authenticated endpoint and preserves body, headers and query parameters', async () => {
    const body = new FormData();
    body.set('title', 'Quarterly report');
    const result = firstValueFrom(
      client.post('/reports/42?view=summary', body, {
        context: apiRequestContext('authenticated'),
        params: new HttpParams().set('limit', 10),
        headers: { 'X-Request-ID': 'request-1', Authorization: 'Bearer stale' },
      }),
    );
    const request = backend.expectOne(`${config.apiBaseUrl}/reports/42?view=summary&limit=10`);
    expect(request.request.body).toBe(body);
    expect(request.request.headers.get('X-Request-ID')).toBe('request-1');
    expect(request.request.headers.get('Authorization')).toBe('Bearer session-token');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush({ saved: true });
    await expect(result).resolves.toEqual({ saved: true });
  });

  it('keeps public requests token-free and their context independent of authenticated calls', async () => {
    const privateContext = apiRequestContext('authenticated');
    const publicContext = apiRequestContext('public');
    storage.read.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    const result = firstValueFrom(
      client.get('/catalog', {
        context: publicContext,
        headers: { Authorization: 'Bearer stale' },
      }),
    );
    const request = backend.expectOne(`${config.apiBaseUrl}/catalog`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(storage.read).not.toHaveBeenCalled();
    request.flush([]);
    await result;
    storage.read.mockReturnValue('session-token');
    const privateResult = firstValueFrom(client.get('/reports', { context: privateContext }));
    const privateRequest = backend.expectOne(`${config.apiBaseUrl}/reports`);
    expect(privateRequest.request.headers.get('Authorization')).toBe('Bearer session-token');
    privateRequest.flush([]);
    await privateResult;
  });

  it.each([null, '', '  '])(
    'does not retain stale authorization for missing token %j',
    async (token) => {
      storage.read.mockReturnValue(token);
      const result = firstValueFrom(
        client.get('/reports', {
          context: apiRequestContext('authenticated'),
          headers: { Authorization: 'Bearer stale' },
        }),
      );
      const request = backend.expectOne(`${config.apiBaseUrl}/reports`);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);
      await result;
    },
  );

  it('does not modify unmarked requests, even familiar API paths or explicit caller headers', async () => {
    for (const url of [
      '/profile',
      '/tasks',
      '/assets/config.json',
      '/api/tasks',
      'https://outside.example/tasks',
    ]) {
      const result = firstValueFrom(client.get(url, { headers: { 'X-Test': 'untouched' } }));
      const request = backend.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      expect(request.request.headers.get('X-Test')).toBe('untouched');
      request.flush({});
      await result;
    }
    const custom = firstValueFrom(
      client.get('https://outside.example/custom', {
        headers: { Authorization: 'Custom caller-owned' },
      }),
    );
    const request = backend.expectOne('https://outside.example/custom');
    expect(request.request.headers.get('Authorization')).toBe('Custom caller-owned');
    request.flush({});
    await custom;
    expect(storage.read).not.toHaveBeenCalled();
  });

  it('rejects marked external and noncanonical paths before storage access or transport', async () => {
    for (const access of ['public', 'authenticated'] as const) {
      for (const url of [
        'https://outside.example/tasks',
        'https://backend.example/api/tasks',
        '//outside.example/tasks',
        'tasks',
        '',
        '/',
        '/tasks/',
        '/tasks//1',
        '/tasks\\1',
        '/tasks#fragment',
        '/tasks/../secret',
        '/%2e%2e/secret',
        '/tasks/%2Fsecret',
        '/tasks/%5csecret',
        '/tasks/%252e%252e',
        '/tasks/%ZZ',
        '/tasks/%00',
        '/tasks\n',
      ]) {
        await expect(
          firstValueFrom(client.get(url, { context: apiRequestContext(access) })),
        ).rejects.toThrow('Invalid API request path');
      }
    }
    backend.expectNone(() => true);
    expect(storage.read).not.toHaveBeenCalled();
  });

  it('retries without duplicating the API base and retains observable HTTP failures', async () => {
    const result = firstValueFrom(
      client
        .get('/reports', {
          context: apiRequestContext('authenticated'),
        })
        .pipe(retry(1)),
    );
    backend
      .expectOne(`${config.apiBaseUrl}/reports`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    const retried = backend.expectOne(`${config.apiBaseUrl}/reports`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer session-token');
    retried.flush([]);
    await expect(result).resolves.toEqual([]);
  });
});
