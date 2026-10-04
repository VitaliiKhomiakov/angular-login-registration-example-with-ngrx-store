import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { appConfig } from '../../../app.config';
import { AuthApiActions, AuthPageActions, AuthSessionActions } from './auth-actions';
import { authFeature } from './auth-feature';
import { SessionTokenStorage } from '../../../session/session-token-storage';

const user = { id: 1, email: 'demo@example.test', firstName: 'Demo', lastName: 'User' };
const credentials = { emailOrPhone: user.email, password: 'private-password' };
const request = {
  firstName: 'New',
  lastName: 'User',
  email: 'new@example.test',
  password: 'private-password',
  confirmPassword: 'private-password',
};

describe('Functional auth Effects with real root Store and HTTP', () => {
  let backend: HttpTestingController;
  let store: Store;
  let storage: SessionTokenStorage;
  const navigate = vi.fn<(url: string) => Promise<boolean>>();
  const reportError = vi.fn<(error: unknown) => void>();

  beforeEach(() => {
    sessionStorage.clear();
    navigate.mockReset().mockResolvedValue(true);
    reportError.mockReset();
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl: navigate } },
        { provide: ErrorHandler, useValue: { handleError: reportError } },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    store = TestBed.inject<Store>(Store);
    storage = TestBed.inject(SessionTokenStorage);
  });
  afterEach(() => {
    backend.verify();
    sessionStorage.clear();
  });

  it('starts the first login despite reducer loading, deduplicates it and authenticates after profile', () => {
    const state = store.selectSignal(authFeature.selectAuthState);
    store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
    expect(state().sessionStatus).toBe('loading');
    const login = backend.expectOne('/api/auth/login');
    expect(login.request.body).toEqual(credentials);
    expect(login.request.headers.has('Authorization')).toBe(false);
    const pending = state();
    store.dispatch(
      AuthPageActions.loginSubmitted({ credentials: { ...credentials, password: 'other' } }),
    );
    store.dispatch(AuthSessionActions.restoreRequested());
    expect(state()).toBe(pending);
    backend.expectNone('/api/auth/login');
    login.flush({ accessToken: 'new-token' });
    const profile = backend.expectOne('/api/profile');
    expect(storage.read()).toBe('new-token');
    expect(profile.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(state().user).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    profile.flush(user);
    expect(state().sessionStatus).toBe('authenticated');
    expect(state().user).toEqual(user);
    expect(navigate).toHaveBeenCalledWith('/profile');
  });

  it('maps invalid login to a safe failure and accepts a later successful login without automatic retry', () => {
    const state = store.selectSignal(authFeature.selectAuthState);
    storage.write('old-token');
    store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
    backend
      .expectOne('/api/auth/login')
      .flush({ message: credentials.password }, { status: 401, statusText: 'Unauthorized' });
    expect(state().sessionStatus).toBe('error');
    expect(state().error).toBe('Invalid email, phone number or password.');
    expect(storage.read()).toBeNull();
    backend.expectNone('/api/auth/login');
    backend.expectNone('/api/profile');
    store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
    backend.expectOne('/api/auth/login').flush({ accessToken: 'retry-token' });
    backend.expectOne('/api/profile').flush(user);
    expect(state().sessionStatus).toBe('authenticated');
    expect(state().error).toBeNull();
  });

  it.each(['http', 'malformed'] as const)(
    'clears a newly issued token on %s profile failure and permits retry',
    (failure) => {
      const state = store.selectSignal(authFeature.selectAuthState);
      store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
      backend.expectOne('/api/auth/login').flush({ accessToken: 'new-token' });
      const profile = backend.expectOne('/api/profile');
      if (failure === 'http')
        profile.flush({ secret: credentials.password }, { status: 500, statusText: 'Failure' });
      else profile.flush({ id: 'wrong', secret: credentials.password });
      expect(state().sessionStatus).toBe('error');
      expect(state().user).toBeNull();
      expect(state().error).not.toContain(credentials.password);
      expect(storage.read()).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
      store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
      backend.expectOne('/api/auth/login').flush({ accessToken: 'retry-token' });
      backend.expectOne('/api/profile').flush(user);
      expect(state().sessionStatus).toBe('authenticated');
    },
  );

  it('rejects malformed login tokens before loading profile', () => {
    store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
    backend.expectOne('/api/auth/login').flush({ accessToken: null });
    expect(store.selectSignal(authFeature.selectSessionStatus)()).toBe('error');
    expect(storage.read()).toBeNull();
    backend.expectNone('/api/profile');
  });

  it('settles restoration without a token as anonymous without HTTP', () => {
    const read = vi.spyOn(storage, 'read');
    store.dispatch(AuthSessionActions.restoreRequested());
    expect(read).toHaveBeenCalledTimes(1);
    expect(store.selectSignal(authFeature.selectSessionStatus)()).toBe('anonymous');
    backend.expectNone('/api/profile');
  });

  it('shares pending restoration ownership with login while registration stays independent', () => {
    const state = store.selectSignal(authFeature.selectAuthState);
    storage.write('saved-token');
    store.dispatch(AuthSessionActions.restoreRequested());
    const profile = backend.expectOne('/api/profile');
    store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
    store.dispatch(AuthSessionActions.restoreRequested());
    backend.expectNone('/api/auth/login');
    backend.expectNone('/api/profile');
    store.dispatch(AuthPageActions.signUpSubmitted({ request }));
    const signup = backend.expectOne('/api/auth/sign-up');
    expect(state().sessionStatus).toBe('loading');
    expect(state().registrationStatus).toBe('loading');
    signup.flush({ id: 2, status: 'created' });
    profile.flush(user);
    expect(state().sessionStatus).toBe('authenticated');
    expect(state().registrationStatus).toBe('success');
    store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
    backend.expectOne('/api/auth/login').flush({ accessToken: 'next-token' });
    backend.expectOne('/api/profile').flush(user);
  });

  it.each(['restore', 'login'] as const)(
    'expires a 401 protected profile during %s',
    (operation) => {
      if (operation === 'restore') {
        storage.write('invalid-token');
        store.dispatch(AuthSessionActions.restoreRequested());
      } else {
        store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
        backend.expectOne('/api/auth/login').flush({ accessToken: 'invalid-token' });
      }
      backend.expectOne('/api/profile').flush({}, { status: 401, statusText: 'Unauthorized' });
      expect(store.selectSignal(authFeature.selectAuthState)()).toEqual({
        user: null,
        sessionStatus: 'anonymous',
        registrationStatus: 'idle',
        error: null,
        registrationError: null,
      });
      expect(storage.read()).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/auth/login');
    },
  );

  it.each(['http', 'network', 'malformed'] as const)(
    'keeps a restoration token after %s failure for explicit retry',
    (failure) => {
      const state = store.selectSignal(authFeature.selectAuthState);
      storage.write('saved-token');
      store.dispatch(AuthSessionActions.restoreRequested());
      const profile = backend.expectOne('/api/profile');
      if (failure === 'http') profile.flush({}, { status: 503, statusText: 'Unavailable' });
      else if (failure === 'network') profile.error(new ProgressEvent('error'));
      else profile.flush({ id: 'wrong' });
      expect(state().sessionStatus).toBe('error');
      expect(state().user).toBeNull();
      expect(storage.read()).toBe('saved-token');
      backend.expectNone('/api/profile');
      store.dispatch(AuthSessionActions.restoreRequested());
      const retry = backend.expectOne('/api/profile');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer saved-token');
      retry.flush(user);
      expect(state().sessionStatus).toBe('authenticated');
    },
  );

  it.each([AuthPageActions.logoutRequested(), AuthSessionActions.expired()])(
    'cancels profile on $type and prevents a late response from reviving a new session',
    (action) => {
      const state = store.selectSignal(authFeature.selectAuthState);
      storage.write('saved-token');
      store.dispatch(AuthSessionActions.restoreRequested());
      const old = backend.expectOne('/api/profile');
      store.dispatch(action);
      expect(old.cancelled).toBe(true);
      expect(state().sessionStatus).toBe('anonymous');
      expect(storage.read()).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/auth/login');
      store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
      const current = state();
      expect(() => old.flush(user)).toThrow('Cannot flush a cancelled request');
      expect(state()).toBe(current);
      backend.expectOne('/api/auth/login').flush({ accessToken: 'current-token' });
      backend.expectOne('/api/profile').flush(user);
      expect(state().sessionStatus).toBe('authenticated');
      expect(storage.read()).toBe('current-token');
    },
  );

  it('cancels pending login and registration on logout', () => {
    store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
    store.dispatch(AuthPageActions.signUpSubmitted({ request }));
    const login = backend.expectOne('/api/auth/login');
    const signup = backend.expectOne('/api/auth/sign-up');
    store.dispatch(AuthPageActions.logoutRequested());
    expect(login.cancelled).toBe(true);
    expect(signup.cancelled).toBe(true);
    expect(store.selectSignal(authFeature.selectRegistrationStatus)()).toBe('idle');
    backend.expectNone('/api/profile');
  });

  it('deduplicates registration, reports conflict and navigates after a successful retry', () => {
    const state = store.selectSignal(authFeature.selectAuthState);
    store.dispatch(AuthPageActions.signUpSubmitted({ request }));
    const signup = backend.expectOne('/api/auth/sign-up');
    expect(signup.request.headers.has('Authorization')).toBe(false);
    store.dispatch(AuthPageActions.signUpSubmitted({ request }));
    backend.expectNone('/api/auth/sign-up');
    signup.flush({ secret: request.password }, { status: 409, statusText: 'Conflict' });
    expect(state().registrationStatus).toBe('error');
    expect(state().registrationError).toBe('This email is already registered.');
    expect(state().sessionStatus).toBe('anonymous');
    backend.expectNone('/api/auth/sign-up');
    store.dispatch(AuthPageActions.signUpSubmitted({ request }));
    backend.expectOne('/api/auth/sign-up').flush({ id: 2, status: 'created' });
    expect(state().registrationStatus).toBe('success');
    expect(navigate).toHaveBeenCalledWith('/auth/login');
    expect(storage.read()).toBeNull();
    backend.expectNone('/api/profile');
  });

  it('turns malformed registration into a failure without killing the next registration', () => {
    store.dispatch(AuthPageActions.signUpSubmitted({ request }));
    backend.expectOne('/api/auth/sign-up').flush({ id: 0, status: 'created' });
    expect(store.selectSignal(authFeature.selectRegistrationStatus)()).toBe('error');
    store.dispatch(AuthPageActions.signUpSubmitted({ request }));
    backend.expectOne('/api/auth/sign-up').flush({ id: 2, status: 'created' });
    expect(store.selectSignal(authFeature.selectRegistrationStatus)()).toBe('success');
  });

  it('settles unavailable storage as a safe error and allows restoration after recovery', () => {
    const read = vi.spyOn(storage, 'read').mockImplementationOnce(() => {
      throw new Error('private storage failure');
    });
    store.dispatch(AuthSessionActions.restoreRequested());
    expect(store.selectSignal(authFeature.selectSessionStatus)()).toBe('error');
    expect(store.selectSignal(authFeature.selectError)()).not.toContain('private');
    backend.expectNone('/api/profile');
    read.mockRestore();
    store.dispatch(AuthSessionActions.restoreRequested());
    expect(store.selectSignal(authFeature.selectSessionStatus)()).toBe('anonymous');
  });

  it('finishes loading when token persistence fails without requesting profile', () => {
    vi.spyOn(storage, 'write').mockImplementationOnce(() => {
      throw new DOMException('private', 'QuotaExceededError');
    });
    store.dispatch(AuthPageActions.loginSubmitted({ credentials }));
    backend.expectOne('/api/auth/login').flush({ accessToken: 'new-token' });
    expect(store.selectSignal(authFeature.selectSessionStatus)()).toBe('error');
    expect(storage.read()).toBeNull();
    backend.expectNone('/api/profile');
  });

  it.each(['authentication', 'registration', 'logout'] as const)(
    'observes rejected %s navigation and keeps the navigation effect alive',
    async (operation) => {
      navigate.mockRejectedValueOnce(new Error(credentials.password));
      const emit = (): void => {
        if (operation === 'authentication') store.dispatch(AuthApiActions.profileLoaded({ user }));
        else if (operation === 'registration') store.dispatch(AuthApiActions.signUpSucceeded());
        else store.dispatch(AuthPageActions.logoutRequested());
      };
      emit();
      await vi.waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));
      const error: unknown = reportError.mock.calls[0]?.[0];
      expect(error).toBeInstanceOf(Error);
      if (!(error instanceof Error)) throw new Error('Expected a safe navigation error');
      expect(error.message).not.toContain(credentials.password);
      emit();
      await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(2));
    },
  );

  it('settles a skipped navigation without an error and accepts the next navigation', async () => {
    navigate.mockResolvedValueOnce(false);
    store.dispatch(AuthApiActions.profileLoaded({ user }));
    await navigate.mock.results[0]?.value;
    expect(reportError).not.toHaveBeenCalled();
    store.dispatch(AuthApiActions.profileLoaded({ user }));
    await navigate.mock.results[1]?.value;
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(reportError).not.toHaveBeenCalled();
  });
});
