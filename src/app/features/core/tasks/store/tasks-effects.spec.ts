import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, Store } from '@ngrx/store';
import { appConfig } from '../../../../app.config';
import {
  AuthApiActions,
  AuthPageActions,
  AuthSessionActions,
} from '../../../auth/store/auth-actions';
import { authFeature } from '../../../auth/store/auth-feature';
import { SessionTokenStorage } from '../../../../session/session-token-storage';
import { TasksPageActions } from './tasks-actions';
import { tasksFeature } from './tasks-feature';
import { tasksRequest } from './tasks-effects';

const rows = [
  { id: 1, title: 'Review', completed: false },
  { id: 2, title: 'Explore', completed: true },
];
const change = TasksPageActions.completionChanged({ id: 1, completed: true });
const resets = [
  TasksPageActions.left(),
  AuthPageActions.logoutRequested(),
  AuthPageActions.loginSubmitted({
    credentials: { emailOrPhone: 'new@example.test', password: 'secret' },
  }),
  AuthSessionActions.restoreRequested(),
  AuthSessionActions.anonymous(),
  AuthSessionActions.expired(),
  AuthApiActions.sessionFailed({ error: 'Unavailable' }),
];

describe('Tasks Effects through real Store, root auth and HTTP', () => {
  let store: Store;
  let backend: HttpTestingController;
  let storage: SessionTokenStorage;
  const navigate = vi.fn<(url: string) => Promise<boolean>>();

  beforeEach(() => {
    sessionStorage.clear();
    navigate.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideState(tasksFeature),
        provideEffects({ tasksRequest }),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl: navigate } },
      ],
    });
    store = TestBed.inject<Store>(Store);
    backend = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(SessionTokenStorage);
    storage.write('demo-token');
  });
  afterEach(() => {
    backend.verify();
    sessionStorage.clear();
  });

  function load(): void {
    store.dispatch(TasksPageActions.entered());
    backend.expectOne('/api/tasks').flush(rows);
  }

  it('starts reads despite reducer loading and shares one owner with saves without queuing', () => {
    const state = store.selectSignal(tasksFeature.selectTasksState);
    store.dispatch(TasksPageActions.entered());
    expect(state().status).toBe('loading');
    const read = backend.expectOne('/api/tasks');
    store.dispatch(TasksPageActions.entered());
    store.dispatch(TasksPageActions.retryRequested());
    store.dispatch(change);
    backend.expectNone((request) => request.url.startsWith('/api/tasks'));
    read.flush(rows);
    expect(state().status).toBe('ready');
    backend.expectNone((request) => request.url.startsWith('/api/tasks'));

    store.dispatch(change);
    const save = backend.expectOne('/api/tasks/1');
    expect(state().status).toBe('saving');
    store.dispatch(change);
    store.dispatch(TasksPageActions.completionChanged({ id: 2, completed: false }));
    store.dispatch(TasksPageActions.entered());
    backend.expectNone((request) => request.url.startsWith('/api/tasks'));
    expect(state().tasks[0]?.completed).toBe(false);
    save.flush({ ...rows[0], completed: true });
    expect(state().tasks).toEqual([{ id: 1, title: 'Review', completed: true }, rows[1]]);
    expect(state().status).toBe('ready');
    backend.expectNone((request) => request.url.startsWith('/api/tasks'));
  });

  it('does not issue requests for rejected idle, redundant or unknown commands', () => {
    store.dispatch(TasksPageActions.retryRequested());
    store.dispatch(change);
    backend.expectNone((request) => request.url.startsWith('/api/tasks'));
    load();
    store.dispatch(TasksPageActions.retryRequested());
    store.dispatch(TasksPageActions.completionChanged({ id: 1, completed: false }));
    store.dispatch(TasksPageActions.completionChanged({ id: 99, completed: true }));
    backend.expectNone((request) => request.url.startsWith('/api/tasks'));
    expect(store.selectSignal(tasksFeature.selectStatus)()).toBe('ready');
  });

  it.each(['http', 'network', 'contract'] as const)(
    'settles %s read errors safely and accepts an explicit retry',
    (failure) => {
      store.dispatch(TasksPageActions.entered());
      const request = backend.expectOne('/api/tasks');
      if (failure === 'http')
        request.flush(
          { message: 'private server detail' },
          { status: 503, statusText: 'Unavailable' },
        );
      else if (failure === 'network') request.error(new ProgressEvent('error'));
      else request.flush({ private: 'server detail' });
      const state = store.selectSignal(tasksFeature.selectTasksState);
      expect(state().status).toBe('error');
      expect(state().error).toBe(
        failure === 'contract'
          ? 'The server returned an invalid response. Please try again.'
          : 'Unable to load your tasks. Please try again.',
      );
      backend.expectNone('/api/tasks');
      store.dispatch(TasksPageActions.retryRequested());
      backend.expectOne('/api/tasks').flush(rows);
      expect(state()).toEqual({ tasks: rows, status: 'ready', pendingTaskId: null, error: null });
    },
  );

  it.each(['http', 'network', 'contract'] as const)(
    'retains rows after a %s save failure and accepts the row retry',
    (failure) => {
      load();
      const state = store.selectSignal(tasksFeature.selectTasksState);
      const original = state().tasks;
      store.dispatch(change);
      const request = backend.expectOne('/api/tasks/1');
      if (failure === 'http')
        request.flush({ message: 'private' }, { status: 503, statusText: 'Unavailable' });
      else if (failure === 'network') request.error(new ProgressEvent('error'));
      else request.flush({ ...rows[0], completed: false });
      expect(state().status).toBe('ready');
      expect(state().tasks).toBe(original);
      expect(state().pendingTaskId).toBeNull();
      expect(state().error).toBe(
        failure === 'contract'
          ? 'The server returned an invalid response. Please try again.'
          : 'Unable to update this task. Please try again.',
      );
      store.dispatch(change);
      backend.expectOne('/api/tasks/1').flush({ ...rows[0], completed: true });
      expect(state().tasks[0]?.completed).toBe(true);
      expect(state().error).toBeNull();
    },
  );

  it.each(['read', 'save'] as const)(
    'expires task %s 401 through root auth cleanup/navigation',
    (operation) => {
      if (operation === 'save') {
        load();
        store.dispatch(change);
      } else store.dispatch(TasksPageActions.entered());
      backend
        .expectOne(operation === 'read' ? '/api/tasks' : '/api/tasks/1')
        .flush({ message: 'private' }, { status: 401, statusText: 'Unauthorized' });
      expect(store.selectSignal(tasksFeature.selectTasksState)()).toEqual({
        tasks: [],
        status: 'idle',
        pendingTaskId: null,
        error: null,
      });
      expect(store.selectSignal(authFeature.selectSessionStatus)()).toBe('anonymous');
      expect(storage.read()).toBeNull();
      expect(navigate).toHaveBeenCalledExactlyOnceWith('/auth/login');
    },
  );

  it.each(resets)(
    'cancels read/write on $type and prevents an old response from repopulating a new session',
    (action) => {
      for (const operation of ['read', 'save'] as const) {
        if (operation === 'save') {
          load();
          store.dispatch(change);
        } else store.dispatch(TasksPageActions.entered());
        const old = backend.expectOne(operation === 'read' ? '/api/tasks' : '/api/tasks/1');
        store.dispatch(action);
        expect(old.cancelled).toBe(true);
        const state = store.selectSignal(tasksFeature.selectTasksState);
        expect(state()).toEqual({ tasks: [], status: 'idle', pendingTaskId: null, error: null });
        // A login/restore reset also starts root auth HTTP. End that test-owned
        // operation before creating the next session, retaining cancellation checks.
        store.dispatch(AuthPageActions.logoutRequested());
        for (const authRequest of backend.match(
          (request) => request.url === '/api/auth/login' || request.url === '/api/profile',
        )) {
          expect(authRequest.cancelled).toBe(true);
        }
        storage.write('new-token');
        store.dispatch(TasksPageActions.entered());
        const current = backend.expectOne('/api/tasks');
        expect(current.request.headers.get('Authorization')).toBe('Bearer new-token');
        expect(() =>
          old.flush(operation === 'read' ? rows : { ...rows[0], completed: true }),
        ).toThrow('Cannot flush a cancelled request');
        current.flush([{ id: 9, title: 'New account', completed: false }]);
        expect(state().tasks).toEqual([{ id: 9, title: 'New account', completed: false }]);
        store.dispatch(TasksPageActions.left());
      }
    },
  );
});
