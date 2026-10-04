import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from './app';
import { appConfig } from './app.config';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ACTIVE_RUNTIME_CHECKS, STORE_FEATURES, Store } from '@ngrx/store';
import { authFeature } from './features/auth/store/auth-feature';
import { AuthPageActions } from './features/auth/store/auth-actions';
import { hostOf } from '../testing/ui-test-helpers';
import { TasksPage } from './features/core/tasks/pages/tasks-page/tasks-page';
import { TasksPageActions } from './features/core/tasks/store/tasks-actions';
import { tasksFeature } from './features/core/tasks/store/tasks-feature';

describe('Application shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: appConfig.providers,
    }).compileComponents();
  });

  it.each(['/', '/auth/login', '/unknown/path'])(
    'renders the login route for %s with the real application providers',
    async (url: string) => {
      const fixture = TestBed.createComponent(App);
      const router = TestBed.inject(Router);
      await router.navigateByUrl(url);
      await fixture.whenStable();

      // ComponentFixture exposes an untyped host; validate this DOM boundary.
      const host: unknown = fixture.nativeElement;
      if (!(host instanceof HTMLElement)) {
        throw new Error('Expected an HTML application host');
      }
      expect(router.url).toBe('/auth/login');
      expect(host.querySelector('main h1')?.textContent).toBe('Sign in');
    },
  );
});

describe('Lazy tasks feature in the real protected application', () => {
  const rows = [
    { id: 1, title: 'Review', completed: false },
    { id: 2, title: 'Explore', completed: true },
  ];

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  async function authenticated() {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Store).dispatch(
      AuthPageActions.loginSubmitted({
        credentials: {
          emailOrPhone: 'demo@example.test',
          password: 'demo-password',
        },
      }),
    );
    const backend = TestBed.inject(HttpTestingController);
    backend.expectOne('/api/auth/login').flush({ accessToken: 'demo-token' });
    backend
      .expectOne('/api/profile')
      .flush({ id: 1, email: 'demo@example.test', firstName: 'Demo', lastName: 'User' });
    await fixture.whenStable();
    return fixture;
  }

  function featureKeys(value: unknown): readonly string[] {
    if (!Array.isArray(value)) throw new Error('Expected feature registrations');
    return value.map((entry: unknown) => {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        !('key' in entry) ||
        typeof entry.key !== 'string'
      ) {
        throw new Error('Expected a named feature');
      }
      return entry.key;
    });
  }

  it('registers tasks once in its lazy injector and reenters with one fresh request', async () => {
    const fixture = await authenticated();
    const router = TestBed.inject(Router);
    const store = TestBed.inject(Store);
    const backend = TestBed.inject(HttpTestingController);
    const host = hostOf(fixture);
    expect(host.querySelectorAll('[data-testid="logout"]')).toHaveLength(1);
    expect(host.querySelector('nav[aria-label="Account navigation"]')).not.toBeNull();
    expect(featureKeys(TestBed.inject(STORE_FEATURES))).toEqual(['auth']);
    await router.navigateByUrl('/tasks');
    expect(router.url).toBe('/tasks');
    const read = await vi.waitFor(() => backend.expectOne('/api/tasks'));
    const state = store.selectSignal(tasksFeature.selectTasksState);
    expect(state().status).toBe('loading');
    read.flush(rows);
    await fixture.whenStable();
    expect(host.querySelector('h1')?.textContent).toBe('My tasks');
    expect(host.querySelector('nav a[aria-current="page"]')?.textContent?.trim()).toBe('My tasks');
    const page = fixture.debugElement.query(By.directive(TasksPage));
    expect(page.injector.get(Store)).toBe(store);
    expect(featureKeys(page.injector.get(STORE_FEATURES))).toEqual(['tasks']);
    expect(TestBed.inject(ACTIVE_RUNTIME_CHECKS)).toMatchObject({
      strictStateImmutability: true,
      strictActionImmutability: true,
      strictStateSerializability: true,
      strictActionSerializability: true,
      strictActionTypeUniqueness: true,
      strictActionWithinNgZone: false,
    });
    expect(Object.isFrozen(state().tasks)).toBe(true);
    expect(Object.isFrozen(state().tasks[0])).toBe(true);
    expect(host.querySelector('[data-testid="task-counts"]')?.textContent).toContain(
      '1 remaining of 2',
    );

    await router.navigateByUrl('/profile');
    await fixture.whenStable();
    expect(state()).toEqual({ tasks: [], status: 'idle', pendingTaskId: null, error: null });
    await router.navigateByUrl('/tasks');
    const reload = await vi.waitFor(() => backend.expectOne('/api/tasks'));
    reload.flush(rows);
    await fixture.whenStable();
    const command = TasksPageActions.completionChanged({ id: 1, completed: true });
    store.dispatch(command);
    expect(Object.isFrozen(command)).toBe(true);
    backend.expectOne('/api/tasks/1').flush({ id: 1, title: 'Review', completed: true });
    await fixture.whenStable();
    expect(host.querySelector('[data-testid="task-counts"]')?.textContent).toContain(
      '0 remaining of 2',
    );
    backend.expectNone((request) => request.url.startsWith('/api/tasks'));
    expect(
      featureKeys(fixture.debugElement.query(By.directive(TasksPage)).injector.get(STORE_FEATURES)),
    ).toEqual(['tasks']);
    expect(featureKeys(TestBed.inject(STORE_FEATURES))).toEqual(['auth']);
  });

  it('denies direct anonymous tasks access without HTTP or private presentation', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/tasks');
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/auth/login');
    TestBed.inject(HttpTestingController).expectNone((request) =>
      request.url.startsWith('/api/tasks'),
    );
    expect(hostOf(fixture).querySelector('app-tasks-page')).toBeNull();
    expect(hostOf(fixture).querySelector('app-core-layout')).toBeNull();
    expect(hostOf(fixture).querySelector('nav')).toBeNull();
    expect(hostOf(fixture).querySelector('[data-testid="logout"]')).toBeNull();
  });

  it.each(['read', 'save'] as const)(
    'cancels pending %s on page exit and fetches on reentry',
    async (operation) => {
      const fixture = await authenticated();
      const router = TestBed.inject(Router);
      const backend = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      await router.navigateByUrl('/tasks');
      const read = await vi.waitFor(() => backend.expectOne('/api/tasks'));
      if (operation === 'save') {
        read.flush(rows);
        await fixture.whenStable();
        store.dispatch(TasksPageActions.completionChanged({ id: 1, completed: true }));
      }
      const pending = operation === 'read' ? read : backend.expectOne('/api/tasks/1');
      await router.navigateByUrl('/profile');
      await fixture.whenStable();
      expect(pending.cancelled).toBe(true);
      const state = store.selectSignal(tasksFeature.selectTasksState);
      expect(state().tasks).toEqual([]);
      await router.navigateByUrl('/tasks');
      const reload = await vi.waitFor(() => backend.expectOne('/api/tasks'));
      expect(() =>
        pending.flush(operation === 'read' ? rows : { ...rows[0], completed: true }),
      ).toThrow('Cannot flush a cancelled request');
      reload.flush(rows);
      await fixture.whenStable();
      expect(state().tasks).toEqual(rows);
    },
  );

  it('expires a tasks 401 through root auth, clears rows/token and removes private navigation', async () => {
    const fixture = await authenticated();
    await TestBed.inject(Router).navigateByUrl('/tasks');
    const pending = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne('/api/tasks'),
    );
    pending.flush({}, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/auth/login');
    expect(sessionStorage.getItem('angular-ngrx-demo.session-token')).toBeNull();
    expect(TestBed.inject(Store).selectSignal(tasksFeature.selectTasksState)()).toEqual({
      tasks: [],
      status: 'idle',
      pendingTaskId: null,
      error: null,
    });
    expect(hostOf(fixture).querySelector('nav')).toBeNull();
  });
});

describe('Application session bootstrap and protected routing', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  function configure(): void {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
  }

  it('restores once after Effects registration and resolves a missing token as anonymous', async () => {
    configure();
    const store = TestBed.inject(Store);
    expect(store.selectSignal(authFeature.selectSessionStatus)()).toBe('anonymous');
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/profile');
    await fixture.whenStable();
    expect(router.url).toBe('/auth/login');
    TestBed.inject(HttpTestingController).expectNone('/api/profile');
    expect(TestBed.inject(Store)).toBe(store);
  });

  it('restores a persisted token once and navigates to the profile page after profile', async () => {
    sessionStorage.setItem('angular-ngrx-demo.session-token', 'saved-token');
    configure();
    const store = TestBed.inject(Store);
    const backend = TestBed.inject(HttpTestingController);
    const pending = backend.expectOne('/api/profile');
    expect(store.selectSignal(authFeature.selectSessionStatus)()).toBe('loading');
    expect(pending.request.headers.get('Authorization')).toBe('Bearer saved-token');
    const fixture = TestBed.createComponent(App);
    pending.flush({ id: 1, email: 'a@example.test', firstName: 'A', lastName: 'B' });
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/profile');
    backend.expectNone('/api/profile');
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) throw new Error('Expected an HTML host');
    expect(host.querySelector('h1')?.textContent).toBe('Profile');
  });

  it('shows restoration failure and retries through the real Store/Effects from the login page', async () => {
    sessionStorage.setItem('angular-ngrx-demo.session-token', 'saved-token');
    configure();
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const backend = TestBed.inject(HttpTestingController);
    await router.navigateByUrl('/auth/login');
    backend.expectOne('/api/profile').flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) throw new Error('Expected an HTML host');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to restore your session',
    );
    const retry = host.querySelector('[data-testid="retry-session"]');
    if (!(retry instanceof HTMLButtonElement))
      throw new Error('Expected the restoration retry button');
    retry.click();
    backend
      .expectOne('/api/profile')
      .flush({ id: 1, email: 'a@example.test', firstName: 'A', lastName: 'B' });
    await fixture.whenStable();
    expect(router.url).toBe('/profile');
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});
