import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store, type Action } from '@ngrx/store';
import { catchError, defer, EMPTY, exhaustMap, map, of, takeUntil, type Observable } from 'rxjs';
import {
  AuthApiActions,
  AuthPageActions,
  AuthSessionActions,
} from '../../../auth/store/auth-actions';
import { TasksApi } from '../data-access/tasks-api';
import { TasksApiContractError } from '../data-access/task-decoders';
import { TasksApiActions, TasksPageActions } from './tasks-actions';
import { tasksFeature } from './tasks-feature';

export const tasksRequest = createEffect(
  (
    actions$ = inject(Actions),
    api = inject(TasksApi),
    store = inject(Store),
  ): Observable<Action> => {
    const state = store.selectSignal(tasksFeature.selectTasksState);
    const cancelled$ = actions$.pipe(
      ofType(
        TasksPageActions.left,
        AuthPageActions.logoutRequested,
        AuthPageActions.loginSubmitted,
        AuthSessionActions.restoreRequested,
        AuthSessionActions.anonymous,
        AuthSessionActions.expired,
        AuthApiActions.sessionFailed,
      ),
    );

    return actions$.pipe(
      ofType(
        TasksPageActions.entered,
        TasksPageActions.retryRequested,
        TasksPageActions.completionChanged,
      ),
      // Reducers have already admitted the operation. A single owner serializes
      // reads and writes; reset events cancel it explicitly, even if DI survives.
      exhaustMap((action) =>
        defer((): Observable<Action> => {
          const current = state();
          if (action.type === TasksPageActions.completionChanged.type) {
            if (current.status !== 'saving' || current.pendingTaskId !== action.id) return EMPTY;
            return api
              .setCompleted(action.id, { completed: action.completed })
              .pipe(map((task) => TasksApiActions.completionSaved({ task })));
          }
          if (current.status !== 'loading') return EMPTY;
          return api.list().pipe(map((tasks) => TasksApiActions.loaded({ tasks })));
        }).pipe(
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401)
              return of(AuthSessionActions.expired());
            const saving = action.type === TasksPageActions.completionChanged.type;
            const message =
              error instanceof TasksApiContractError
                ? 'The server returned an invalid response. Please try again.'
                : saving
                  ? 'Unable to update this task. Please try again.'
                  : 'Unable to load your tasks. Please try again.';
            return of(
              saving
                ? TasksApiActions.completionFailed({ id: action.id, error: message })
                : TasksApiActions.loadFailed({ error: message }),
            );
          }),
          takeUntil(cancelled$),
        ),
      ),
    );
  },
  { functional: true },
);
