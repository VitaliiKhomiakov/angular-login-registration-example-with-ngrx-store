import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import type { Action } from '@ngrx/store';
import {
  catchError,
  defer,
  EMPTY,
  exhaustMap,
  filter,
  map,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  tap,
  type Observable,
} from 'rxjs';
import { AuthApiActions, AuthPageActions, AuthSessionActions } from './auth-actions';
import { AuthApi } from '../data-access/auth-api';
import { ApiContractError } from '../data-access/auth-decoders';
import { SessionTokenStorage } from '../../../session/session-token-storage';

function clearToken(storage: SessionTokenStorage, errors: ErrorHandler): void {
  try {
    storage.clear();
  } catch {
    errors.handleError(new Error('Unable to clear the saved session.'));
  }
}

function failureMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiContractError)
    return 'The server returned an invalid response. Please try again.';
  return fallback;
}

function navigate(router: Router, errors: ErrorHandler, url: string): Observable<boolean> {
  return defer(() => router.navigateByUrl(url)).pipe(
    // Same-URL skips and superseded navigations settle normally with false.
    filter((completed) => completed),
    catchError(() => {
      errors.handleError(new Error('Unable to navigate.'));
      return EMPTY;
    }),
  );
}

export const authenticateSession = createEffect(
  (
    actions$ = inject(Actions),
    authApi = inject(AuthApi),
    storage = inject(SessionTokenStorage),
    errors = inject(ErrorHandler),
  ): Observable<Action> => {
    const cancelled$ = actions$.pipe(
      ofType(AuthPageActions.logoutRequested, AuthSessionActions.expired),
    );

    const loadProfile = (restoring: boolean): Observable<Action> =>
      authApi.loadProfile().pipe(
        map((user) => AuthApiActions.profileLoaded({ user })),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            return of(AuthSessionActions.expired());
          }
          if (!restoring) clearToken(storage, errors);
          return of(
            AuthApiActions.sessionFailed({
              error: failureMessage(
                error,
                restoring
                  ? 'Unable to restore your session. Please try again.'
                  : 'Unable to load your profile. Please sign in again.',
              ),
            }),
          );
        }),
      );

    return actions$.pipe(
      ofType(AuthPageActions.loginSubmitted, AuthSessionActions.restoreRequested),
      // Reducer already set loading. This shared owner admits the first request.
      exhaustMap((action) =>
        defer(() => {
          if (action.type === AuthPageActions.loginSubmitted.type) {
            return authApi.login(action.credentials).pipe(
              tap((tokens) => storage.write(tokens.accessToken)),
              switchMap(() => loadProfile(false)),
            );
          }
          const token = storage.read();
          return token?.trim() ? loadProfile(true) : of(AuthSessionActions.anonymous());
        }).pipe(
          catchError((error: unknown) => {
            const restoring = action.type === AuthSessionActions.restoreRequested.type;
            if (!restoring) clearToken(storage, errors);
            const invalidCredentials = error instanceof HttpErrorResponse && error.status === 401;
            return of(
              AuthApiActions.sessionFailed({
                error: failureMessage(
                  error,
                  restoring
                    ? 'Unable to restore your session. Please try again.'
                    : invalidCredentials
                      ? 'Invalid email, phone number or password.'
                      : 'Unable to sign in. Please try again.',
                ),
              }),
            );
          }),
          takeUntil(cancelled$),
        ),
      ),
    );
  },
  { functional: true },
);

export const signUp = createEffect(
  (actions$ = inject(Actions), authApi = inject(AuthApi)): Observable<Action> =>
    actions$.pipe(
      ofType(AuthPageActions.signUpSubmitted),
      exhaustMap(({ request }) =>
        defer(() => authApi.signUp(request)).pipe(
          map(() => AuthApiActions.signUpSucceeded()),
          catchError((error: unknown) =>
            of(
              AuthApiActions.signUpFailed({
                error: failureMessage(
                  error,
                  error instanceof HttpErrorResponse && error.status === 409
                    ? 'This email is already registered.'
                    : 'Unable to create your account. Please try again.',
                ),
              }),
            ),
          ),
          takeUntil(
            actions$.pipe(ofType(AuthPageActions.logoutRequested, AuthSessionActions.expired)),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const clearSession = createEffect(
  (
    actions$ = inject(Actions),
    storage = inject(SessionTokenStorage),
    router = inject(Router),
    errors = inject(ErrorHandler),
  ): Observable<boolean> =>
    actions$.pipe(
      ofType(AuthPageActions.logoutRequested, AuthSessionActions.expired),
      tap(() => clearToken(storage, errors)),
      mergeMap(() => navigate(router, errors, '/auth/login')),
    ),
  { functional: true, dispatch: false },
);

export const navigateAfterAuthentication = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
    errors = inject(ErrorHandler),
  ): Observable<boolean> =>
    actions$.pipe(
      ofType(AuthApiActions.profileLoaded),
      mergeMap(() => navigate(router, errors, '/profile')),
    ),
  { functional: true, dispatch: false },
);

export const navigateAfterRegistration = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
    errors = inject(ErrorHandler),
  ): Observable<boolean> =>
    actions$.pipe(
      ofType(AuthApiActions.signUpSucceeded),
      mergeMap(() => navigate(router, errors, '/auth/login')),
    ),
  { functional: true, dispatch: false },
);
