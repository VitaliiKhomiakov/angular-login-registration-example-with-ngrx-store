import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../../config/app-config';
import { apiInterceptor } from '../../../../http/api-interceptor';
import { apiRequestContext } from '../../../../http/api-request-context';
import { SessionTokenStorage } from '../../../../session/session-token-storage';
import { TasksApi } from './tasks-api';
import { TasksApiContractError } from './task-decoders';

const task = { id: 1, title: 'Review structure', completed: false };

describe.each([
  { mode: 'demo', apiBaseUrl: '/api' },
  { mode: 'remote', apiBaseUrl: 'https://backend.example/api' },
] as const)('Tasks transport in $mode mode', (config) => {
  let backend: HttpTestingController;
  let api: TasksApi;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_CONFIG, useValue: config },
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    api = TestBed.inject(TasksApi);
    TestBed.inject(SessionTokenStorage).write('demo-token');
  });
  afterEach(() => {
    backend.verify();
    sessionStorage.clear();
  });

  it('lists and saves through the configured base and private token', async () => {
    const listed = firstValueFrom(api.list());
    const get = backend.expectOne(`${config.apiBaseUrl}/tasks`);
    expect(get.request.method).toBe('GET');
    expect(get.request.headers.get('Authorization')).toBe('Bearer demo-token');
    get.flush([{ ...task, ignored: 'not a DTO field' }]);
    await expect(listed).resolves.toEqual([task]);

    const command = { completed: true, userId: 42 };
    const saved = firstValueFrom(api.setCompleted(1, command));
    const patch = backend.expectOne(`${config.apiBaseUrl}/tasks/1`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ completed: true });
    expect(patch.request.headers.get('Authorization')).toBe('Bearer demo-token');
    patch.flush({ ...task, completed: true });
    await expect(saved).resolves.toEqual({ ...task, completed: true });
  });

  it('marks task requests explicitly, preserves queries/headers and leaves unmarked calls alone', async () => {
    TestBed.inject(SessionTokenStorage).clear();
    const client = TestBed.inject(HttpClient);
    for (const url of ['/tasks', '/tasks/12?view=active']) {
      const result = firstValueFrom(
        client.get(url, {
          context: apiRequestContext('authenticated'),
          headers: { 'X-Test': 'preserved' },
        }),
      );
      const request = backend.expectOne(`${config.apiBaseUrl}${url}`);
      expect(request.request.headers.has('Authorization')).toBe(false);
      expect(request.request.headers.get('X-Test')).toBe('preserved');
      request.flush([]);
      await result;
    }
    TestBed.inject(SessionTokenStorage).write('demo-token');
    for (const url of [
      '/tasks/0',
      '/tasks/-1',
      '/tasks/1.5',
      '/tasks/01',
      '/tasks/9007199254740992',
      '/tasks/1/details',
      '/tasks/',
      '/tasks-extra',
      '/api/tasks',
      '/assets/tasks',
      'https://outside.example/tasks',
      'https://backend.example/api/tasks',
    ]) {
      const result = firstValueFrom(client.get(url));
      const request = backend.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);
      await result;
    }
  });

  it('rejects invalid IDs before transport, mismatched saves and malformed lists', async () => {
    for (const id of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(firstValueFrom(api.setCompleted(id, { completed: true }))).rejects.toThrow(
        TasksApiContractError,
      );
    }
    backend.expectNone((request) => request.method === 'PATCH');
    for (const response of [{ ...task, id: 2, completed: true }, task, { id: 1 }]) {
      const result = firstValueFrom(api.setCompleted(1, { completed: true }));
      const assertion = expect(result).rejects.toThrow(TasksApiContractError);
      backend.expectOne(`${config.apiBaseUrl}/tasks/1`).flush(response);
      await assertion;
    }
    const result = firstValueFrom(api.list());
    const assertion = expect(result).rejects.toThrow(TasksApiContractError);
    backend.expectOne(`${config.apiBaseUrl}/tasks`).flush({ tasks: [] });
    await assertion;
  });

  it('leaves HTTP errors observable and allows the next request', async () => {
    const failed = firstValueFrom(api.list());
    const assertion = expect(failed).rejects.toMatchObject({ status: 503 });
    backend
      .expectOne(`${config.apiBaseUrl}/tasks`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await assertion;
    const retry = firstValueFrom(api.list());
    backend.expectOne(`${config.apiBaseUrl}/tasks`).flush([]);
    await expect(retry).resolves.toEqual([]);
  });
});
