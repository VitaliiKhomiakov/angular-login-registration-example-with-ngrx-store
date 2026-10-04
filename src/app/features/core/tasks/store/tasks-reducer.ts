import { createReducer, on } from '@ngrx/store';
import {
  AuthApiActions,
  AuthPageActions,
  AuthSessionActions,
} from '../../../auth/store/auth-actions';
import { TasksApiActions, TasksPageActions } from './tasks-actions';
import type { TasksState } from './tasks-state';

export const initialState: TasksState = {
  tasks: [],
  status: 'idle',
  pendingTaskId: null,
  error: null,
};

export const tasksReducer = createReducer(
  initialState,
  on(TasksPageActions.entered, (state): TasksState => {
    if (state.status === 'loading' || state.status === 'saving') return state;
    return { ...state, status: 'loading', pendingTaskId: null, error: null };
  }),
  on(TasksPageActions.retryRequested, (state): TasksState =>
    state.status === 'error'
      ? { ...state, status: 'loading', pendingTaskId: null, error: null }
      : state,
  ),
  on(TasksPageActions.completionChanged, (state, { id, completed }): TasksState => {
    const task = state.tasks.find((item) => item.id === id);
    if (state.status !== 'ready' || !task || task.completed === completed) return state;
    return { ...state, status: 'saving', pendingTaskId: id, error: null };
  }),
  on(TasksApiActions.loaded, (state, { tasks }): TasksState =>
    state.status === 'loading'
      ? { tasks, status: 'ready', pendingTaskId: null, error: null }
      : state,
  ),
  on(TasksApiActions.loadFailed, (state, { error }): TasksState =>
    state.status === 'loading' ? { ...state, status: 'error', pendingTaskId: null, error } : state,
  ),
  on(TasksApiActions.completionSaved, (state, { task }): TasksState => {
    if (state.status !== 'saving' || state.pendingTaskId !== task.id) return state;
    return {
      tasks: state.tasks.map((item) => (item.id === task.id ? task : item)),
      status: 'ready',
      pendingTaskId: null,
      error: null,
    };
  }),
  on(TasksApiActions.completionFailed, (state, { id, error }): TasksState =>
    state.status === 'saving' && state.pendingTaskId === id
      ? { ...state, status: 'ready', pendingTaskId: null, error }
      : state,
  ),
  on(
    TasksPageActions.left,
    AuthPageActions.logoutRequested,
    AuthPageActions.loginSubmitted,
    AuthSessionActions.restoreRequested,
    AuthSessionActions.anonymous,
    AuthSessionActions.expired,
    AuthApiActions.sessionFailed,
    (): TasksState => initialState,
  ),
);
