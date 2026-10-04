import { createReducer, on } from '@ngrx/store';
import { AuthApiActions, AuthPageActions, AuthSessionActions } from './auth-actions';
import type { AuthState } from './auth-state';

export const initialState: AuthState = {
  user: null,
  sessionStatus: 'unknown',
  registrationStatus: 'idle',
  error: null,
  registrationError: null,
};

export const authReducer = createReducer(
  initialState,
  on(AuthPageActions.loginSubmitted, AuthSessionActions.restoreRequested, (state): AuthState => {
    if (state.sessionStatus === 'loading') {
      return state;
    }
    return { ...state, user: null, sessionStatus: 'loading', error: null };
  }),
  on(AuthApiActions.profileLoaded, (state, { user }): AuthState => ({
    ...state,
    user,
    sessionStatus: 'authenticated',
    error: null,
  })),
  on(AuthApiActions.sessionFailed, (state, { error }): AuthState => ({
    ...state,
    user: null,
    sessionStatus: 'error',
    error,
  })),
  on(AuthSessionActions.anonymous, (state): AuthState => ({
    ...state,
    user: null,
    sessionStatus: 'anonymous',
    error: null,
  })),
  on(AuthPageActions.logoutRequested, AuthSessionActions.expired, (): AuthState => ({
    ...initialState,
    sessionStatus: 'anonymous',
  })),
  on(AuthPageActions.signUpSubmitted, (state): AuthState => {
    if (state.registrationStatus === 'loading') {
      return state;
    }
    return { ...state, registrationStatus: 'loading', registrationError: null };
  }),
  on(AuthApiActions.signUpSucceeded, (state): AuthState => ({
    ...state,
    registrationStatus: 'success',
    registrationError: null,
  })),
  on(AuthApiActions.signUpFailed, (state, { error }): AuthState => ({
    ...state,
    registrationStatus: 'error',
    registrationError: error,
  })),
);
