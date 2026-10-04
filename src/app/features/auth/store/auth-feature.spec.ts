import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Store } from '@ngrx/store';
import { appConfig } from '../../../app.config';
import { AuthApiActions, AuthPageActions, AuthSessionActions } from './auth-actions';
import { authFeature } from './auth-feature';
import { authReducer } from './auth-reducer';
import {
  selectError,
  selectIsAuthenticated,
  selectIsLoading,
  selectRegistrationError,
  selectRegistrationStatus,
  selectSessionStatus,
  selectUser,
} from './auth-selectors';
import type { AuthState } from './auth-state';
import type { LoginCredentials, SignUpRequest, User } from '../data-access/auth-contracts';

const user: User = { id: 1, email: 'demo@example.test', firstName: 'Demo', lastName: 'User' };
const credentials: LoginCredentials = { emailOrPhone: user.email, password: 'secret' };
const request: SignUpRequest = {
  firstName: 'New',
  lastName: 'User',
  email: 'new@example.test',
  password: 'secret',
  confirmPassword: 'secret',
};
const initial: AuthState = {
  user: null,
  sessionStatus: 'unknown',
  registrationStatus: 'idle',
  error: null,
  registrationError: null,
};
const authenticated: AuthState = { ...initial, user, sessionStatus: 'authenticated' };

describe('Auth transitions and selectors', () => {
  const reduce = authReducer;

  it('starts with exactly the specified state and keeps unknown events unchanged', () => {
    const state = reduce(undefined, { type: 'unrelated' });
    expect(state).toEqual(initial);
    expect(reduce(state, { type: 'unrelated' })).toBe(state);
  });

  it.each([AuthPageActions.loginSubmitted({ credentials }), AuthSessionActions.restoreRequested()])(
    'starts session loading for $type without retaining credentials or a prior user',
    (action) => {
      const state: AuthState = {
        ...authenticated,
        error: 'Old failure',
        registrationStatus: 'success',
      };
      expect(reduce(state, action)).toEqual({
        user: null,
        sessionStatus: 'loading',
        error: null,
        registrationStatus: 'success',
        registrationError: null,
      });
    },
  );

  it.each([AuthPageActions.loginSubmitted({ credentials }), AuthSessionActions.restoreRequested()])(
    'preserves the exact pending session for $type',
    (action) => {
      const pending: AuthState = {
        ...initial,
        sessionStatus: 'loading',
        registrationError: 'Keep',
      };
      expect(reduce(pending, action)).toBe(pending);
    },
  );

  it('authenticates only on the profile outcome and clears the session error', () => {
    const state: AuthState = { ...initial, sessionStatus: 'loading', error: 'Old' };
    expect(reduce(state, AuthApiActions.profileLoaded({ user }))).toEqual(authenticated);
  });

  it('ends failed loading, drops the prior user and permits a later login', () => {
    const failed = reduce(
      { ...authenticated, sessionStatus: 'loading' },
      AuthApiActions.sessionFailed({ error: 'Unavailable' }),
    );
    expect(failed).toEqual({ ...initial, sessionStatus: 'error', error: 'Unavailable' });
    expect(selectIsLoading({ auth: failed })).toBe(false);
    expect(reduce(failed, AuthPageActions.loginSubmitted({ credentials }))).toEqual({
      ...initial,
      sessionStatus: 'loading',
    });
  });

  it.each([AuthPageActions.logoutRequested(), AuthSessionActions.expired()])(
    'clears user, both errors and registration on $type',
    (action) => {
      const state: AuthState = {
        ...authenticated,
        error: 'Session error',
        registrationStatus: 'error',
        registrationError: 'Registration error',
      };
      expect(reduce(state, action)).toEqual({ ...initial, sessionStatus: 'anonymous' });
    },
  );

  it('settles a missing session independently of registration', () => {
    const state: AuthState = { ...authenticated, error: 'Old', registrationStatus: 'loading' };
    expect(reduce(state, AuthSessionActions.anonymous())).toEqual({
      ...initial,
      sessionStatus: 'anonymous',
      registrationStatus: 'loading',
    });
  });

  it('keeps session data intact across registration submit, failure, retry and success', () => {
    const pending = reduce(authenticated, AuthPageActions.signUpSubmitted({ request }));
    expect(pending).toEqual({ ...authenticated, registrationStatus: 'loading' });
    const failed = reduce(pending, AuthApiActions.signUpFailed({ error: 'Email already used' }));
    expect(failed).toEqual({
      ...authenticated,
      registrationStatus: 'error',
      registrationError: 'Email already used',
    });
    const retry = reduce(failed, AuthPageActions.signUpSubmitted({ request }));
    expect(retry).toEqual({ ...authenticated, registrationStatus: 'loading' });
    expect(reduce(retry, AuthApiActions.signUpSucceeded())).toEqual({
      ...authenticated,
      registrationStatus: 'success',
    });
    expect(pending.user).toBe(user);
    expect(selectIsLoading({ auth: pending })).toBe(false);
  });

  it('keeps registration intact across session submit, success and failure', () => {
    const state: AuthState = { ...initial, registrationStatus: 'error', registrationError: 'Keep' };
    const pending = reduce(state, AuthSessionActions.restoreRequested());
    const loaded = reduce(pending, AuthApiActions.profileLoaded({ user }));
    const failed = reduce(pending, AuthApiActions.sessionFailed({ error: 'Offline' }));
    for (const result of [pending, loaded, failed]) {
      expect(result.registrationStatus).toBe('error');
      expect(result.registrationError).toBe('Keep');
    }
  });

  it('preserves a repeated registration submit while loading without changing the session', () => {
    const pending: AuthState = { ...authenticated, registrationStatus: 'loading' };
    expect(reduce(pending, AuthPageActions.signUpSubmitted({ request }))).toBe(pending);
  });

  it('allows independent session and registration loading', () => {
    const session = reduce(initial, AuthPageActions.loginSubmitted({ credentials }));
    const both = reduce(session, AuthPageActions.signUpSubmitted({ request }));
    expect(both).toEqual({ ...initial, sessionStatus: 'loading', registrationStatus: 'loading' });
    expect(reduce(both, AuthApiActions.signUpSucceeded())).toEqual({
      ...initial,
      sessionStatus: 'loading',
      registrationStatus: 'success',
    });
  });

  it('does not mutate original state, user or submit payloads', () => {
    const originalUser = Object.freeze({ ...user });
    const original = Object.freeze({ ...authenticated, user: originalUser });
    const action = Object.freeze(
      AuthPageActions.loginSubmitted({ credentials: Object.freeze({ ...credentials }) }),
    );
    reduce(original, action);
    reduce(original, AuthApiActions.profileLoaded({ user: originalUser }));
    reduce(original, AuthPageActions.logoutRequested());
    expect(original).toEqual(authenticated);
    expect(originalUser).toEqual(user);
    expect(action.credentials).toEqual(credentials);
  });

  it.each([
    ['unknown', false, false],
    ['loading', true, false],
    ['authenticated', false, true],
    ['anonymous', false, false],
    ['error', false, false],
  ] as const)('derives session flags for %s', (sessionStatus, loading, authorized) => {
    const root = { auth: { ...initial, sessionStatus } };
    expect(selectIsLoading(root)).toBe(loading);
    expect(selectIsAuthenticated(root)).toBe(authorized);
    expect(selectSessionStatus(root)).toBe(sessionStatus);
  });

  it('selects user and separate errors/status from the registered feature shape', () => {
    const root = {
      auth: {
        ...authenticated,
        error: 'Session failure',
        registrationStatus: 'error',
        registrationError: 'Conflict',
      } satisfies AuthState,
    };
    expect(selectUser(root)).toBe(user);
    expect(selectError(root)).toBe('Session failure');
    expect(selectRegistrationStatus(root)).toBe('error');
    expect(selectRegistrationError(root)).toBe('Conflict');
    expect(selectUser({ ...root, unrelated: 42 })).toBe(user);
  });
});

describe('Auth Store integration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  it('exposes auth transitions through real Store signals', () => {
    const store = TestBed.inject(Store);
    const state = store.selectSignal(authFeature.selectAuthState);
    const loading = store.selectSignal(selectIsLoading);
    const authorized = store.selectSignal(selectIsAuthenticated);
    expect(state()).toEqual({ ...initial, sessionStatus: 'anonymous' });
    store.dispatch(AuthPageActions.loginSubmitted({ credentials: { ...credentials } }));
    expect(loading()).toBe(true);
    expect(authorized()).toBe(false);
    const backend = TestBed.inject(HttpTestingController);
    backend.expectOne('/api/auth/login').flush({ accessToken: 'test-token' });
    backend.expectOne('/api/profile').flush(user);
    expect(loading()).toBe(false);
    expect(authorized()).toBe(true);
    expect(state().user).toEqual(user);
    store.dispatch(AuthPageActions.logoutRequested());
    expect(state()).toEqual({ ...initial, sessionStatus: 'anonymous' });
  });

  it('protects state and nested action data without storing credentials', () => {
    const store = TestBed.inject(Store);
    const state = store.selectSignal(authFeature.selectAuthState);
    const action = AuthPageActions.loginSubmitted({ credentials: { ...credentials } });
    store.dispatch(action);
    expect(Object.isFrozen(action)).toBe(true);
    expect(Object.isFrozen(action.credentials)).toBe(true);
    expect(Object.isFrozen(state())).toBe(true);
    expect(state()).toEqual({ ...initial, sessionStatus: 'loading' });
    const backend = TestBed.inject(HttpTestingController);
    backend.expectOne('/api/auth/login').flush({ accessToken: 'test-token' });
    backend.expectOne('/api/profile').flush(user);
    expect(Object.isFrozen(state().user)).toBe(true);
  });
});
