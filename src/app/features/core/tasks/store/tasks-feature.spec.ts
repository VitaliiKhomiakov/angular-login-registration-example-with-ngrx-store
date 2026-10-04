import {
  AuthApiActions,
  AuthPageActions,
  AuthSessionActions,
} from '../../../auth/store/auth-actions';
import type { Task } from '../data-access/task-contracts';
import { TasksApiActions, TasksPageActions } from './tasks-actions';
import { initialState, tasksReducer } from './tasks-reducer';
import {
  selectActiveTasks,
  selectCompletedTasks,
  selectIsBusy,
  selectIsLoading,
  selectIsSaving,
  selectPendingTaskId,
  selectRemainingCount,
  selectTasks,
  selectTasksError,
  selectTasksStatus,
  selectTotalCount,
} from './tasks-selectors';
import type { TasksState } from './tasks-state';

const rows: readonly Task[] = Object.freeze([
  Object.freeze({ id: 1, title: 'Read', completed: false }),
  Object.freeze({ id: 2, title: 'Try', completed: true }),
]);
const ready: TasksState = Object.freeze({
  tasks: rows,
  status: 'ready',
  pendingTaskId: null,
  error: null,
});
const load: TasksState = Object.freeze({ ...ready, status: 'loading' });
const save: TasksState = Object.freeze({ ...ready, status: 'saving', pendingTaskId: 1 });
const changed = TasksPageActions.completionChanged({ id: 1, completed: true });
const confirmed: Task = Object.freeze({ id: 1, title: 'Read', completed: true });
const resets = [
  TasksPageActions.left(),
  AuthPageActions.logoutRequested(),
  AuthPageActions.loginSubmitted({
    credentials: { emailOrPhone: 'demo@example.test', password: 'secret' },
  }),
  AuthSessionActions.restoreRequested(),
  AuthSessionActions.anonymous(),
  AuthSessionActions.expired(),
  AuthApiActions.sessionFailed({ error: 'Unavailable' }),
];

describe('Tasks transitions and selectors', () => {
  it('starts with the exact minimal state and ignores unrelated actions', () => {
    expect(tasksReducer(undefined, { type: 'unrelated' })).toEqual({
      tasks: [],
      status: 'idle',
      pendingTaskId: null,
      error: null,
    });
    expect(tasksReducer(ready, { type: 'unrelated' })).toBe(ready);
  });

  it('loads on entry, retaining rows and clearing stale errors', () => {
    expect(tasksReducer(initialState, TasksPageActions.entered())).toEqual({
      ...initialState,
      status: 'loading',
    });
    const pending = tasksReducer({ ...ready, error: 'Old' }, TasksPageActions.entered());
    expect(pending).toEqual(load);
    expect(pending.tasks).toBe(rows);
    expect(tasksReducer(pending, TasksApiActions.loaded({ tasks: [] }))).toEqual({
      ...ready,
      tasks: [],
    });
  });

  it('ends a failed read and allows only a read-error retry', () => {
    const failed = tasksReducer(load, TasksApiActions.loadFailed({ error: 'Unavailable' }));
    expect(failed).toEqual({ ...ready, status: 'error', error: 'Unavailable' });
    expect(selectIsBusy({ tasks: failed })).toBe(false);
    expect(tasksReducer(failed, TasksPageActions.retryRequested())).toEqual(load);
    for (const state of [initialState, ready, load, save, { ...ready, error: 'Save failed' }]) {
      expect(tasksReducer(state, TasksPageActions.retryRequested())).toBe(state);
    }
  });

  it('saves the pending identity and replaces only the confirmed row', () => {
    const pending = tasksReducer({ ...ready, error: 'Old' }, changed);
    expect(pending).toEqual(save);
    expect(pending.tasks).toBe(rows);
    const result = tasksReducer(pending, TasksApiActions.completionSaved({ task: confirmed }));
    expect(result).toEqual({ ...ready, tasks: [confirmed, rows[1]] });
    expect(result.tasks[0]).toBe(confirmed);
    expect(result.tasks[1]).toBe(rows[1]);
    expect(rows).toEqual([
      { id: 1, title: 'Read', completed: false },
      { id: 2, title: 'Try', completed: true },
    ]);
  });

  it('retains confirmed rows after a failed save and permits an explicit row retry', () => {
    const failed = tasksReducer(
      save,
      TasksApiActions.completionFailed({ id: 1, error: 'Unavailable' }),
    );
    expect(failed).toEqual({ ...ready, error: 'Unavailable' });
    expect(failed.tasks).toBe(rows);
    expect(tasksReducer(failed, changed)).toEqual(save);
  });

  it.each([load, save])(
    'preserves the exact busy state during additional commands (%s)',
    (state) => {
      for (const action of [
        TasksPageActions.entered(),
        TasksPageActions.retryRequested(),
        changed,
      ]) {
        expect(tasksReducer(state, action)).toBe(state);
      }
    },
  );

  it('ignores invalid/redundant changes and changes outside ready state', () => {
    for (const id of [0, -1, 1.5, 42, NaN]) {
      expect(tasksReducer(ready, TasksPageActions.completionChanged({ id, completed: true }))).toBe(
        ready,
      );
    }
    expect(
      tasksReducer(ready, TasksPageActions.completionChanged({ id: 1, completed: false })),
    ).toBe(ready);
    for (const state of [initialState, { ...ready, status: 'error' } satisfies TasksState]) {
      expect(tasksReducer(state, changed)).toBe(state);
    }
  });

  it.each(resets)('clears page/session data on $type during read and save', (action) => {
    for (const state of [
      ready,
      load,
      save,
      { ...ready, status: 'error', error: 'Old' } satisfies TasksState,
    ]) {
      const reset = tasksReducer(state, action);
      expect(reset).toEqual({ tasks: [], status: 'idle', pendingTaskId: null, error: null });
      for (const outcome of [
        TasksApiActions.loaded({ tasks: rows }),
        TasksApiActions.loadFailed({ error: 'Late' }),
        TasksApiActions.completionSaved({ task: confirmed }),
        TasksApiActions.completionFailed({ id: 1, error: 'Late' }),
      ])
        expect(tasksReducer(reset, outcome)).toBe(reset);
    }
  });

  it('ignores outcomes for another operation or pending identity', () => {
    expect(tasksReducer(save, TasksApiActions.loaded({ tasks: [] }))).toBe(save);
    expect(tasksReducer(save, TasksApiActions.loadFailed({ error: 'Late' }))).toBe(save);
    expect(tasksReducer(load, TasksApiActions.completionSaved({ task: confirmed }))).toBe(load);
    expect(tasksReducer(save, TasksApiActions.completionSaved({ task: rows[1] }))).toBe(save);
    expect(tasksReducer(save, TasksApiActions.completionFailed({ id: 2, error: 'Late' }))).toBe(
      save,
    );
  });

  it('does not reset tasks for registration-only events', () => {
    for (const action of [
      AuthPageActions.signUpSubmitted({
        request: {
          firstName: 'A',
          lastName: 'B',
          email: 'a@example.test',
          password: 'secret',
          confirmPassword: 'secret',
        },
      }),
      AuthApiActions.signUpSucceeded(),
      AuthApiActions.signUpFailed({ error: 'Conflict' }),
    ])
      expect(tasksReducer(save, action)).toBe(save);
  });

  it('does not mutate frozen input states, rows or command/outcome payloads', () => {
    const command = Object.freeze(changed);
    const outcome = Object.freeze(TasksApiActions.completionSaved({ task: confirmed }));
    tasksReducer(ready, command);
    tasksReducer(save, outcome);
    tasksReducer(load, Object.freeze(TasksApiActions.loaded({ tasks: rows })));
    expect(ready).toEqual({
      tasks: [
        { id: 1, title: 'Read', completed: false },
        { id: 2, title: 'Try', completed: true },
      ],
      status: 'ready',
      pendingTaskId: null,
      error: null,
    });
    expect(command).toEqual({ type: '[Tasks Page] Completion Changed', id: 1, completed: true });
    expect(confirmed).toEqual({ id: 1, title: 'Read', completed: true });
  });

  it('selects rows/errors/pending identity and derives stable arrays and counts', () => {
    const root = { tasks: { ...save, error: 'Failure' } };
    expect(selectTasks(root)).toBe(rows);
    expect(selectTasksStatus(root)).toBe('saving');
    expect(selectPendingTaskId(root)).toBe(1);
    expect(selectTasksError(root)).toBe('Failure');
    expect(selectActiveTasks(root)).toEqual([rows[0]]);
    expect(selectCompletedTasks(root)).toEqual([rows[1]]);
    expect(selectRemainingCount(root)).toBe(1);
    expect(selectTotalCount(root)).toBe(2);
    const active = selectActiveTasks(root);
    expect(selectActiveTasks({ tasks: { ...root.tasks, error: null } })).toBe(active);
    const saved = tasksReducer(save, TasksApiActions.completionSaved({ task: confirmed }));
    expect(selectRemainingCount({ tasks: saved })).toBe(0);
    expect(selectTotalCount({ tasks: saved })).toBe(2);
    expect(selectCompletedTasks({ tasks: saved })).toEqual([confirmed, rows[1]]);
    expect(selectTotalCount({ tasks: initialState })).toBe(0);
  });

  it.each([
    ['idle', false, false, false],
    ['loading', true, false, true],
    ['saving', false, true, true],
    ['ready', false, false, false],
    ['error', false, false, false],
  ] as const)('derives request flags for %s', (status, loading, saving, busy) => {
    const root = { tasks: { ...initialState, status } };
    expect(selectIsLoading(root)).toBe(loading);
    expect(selectIsSaving(root)).toBe(saving);
    expect(selectIsBusy(root)).toBe(busy);
  });
});
