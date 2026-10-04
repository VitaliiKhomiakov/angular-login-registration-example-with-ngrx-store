import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Task } from '../data-access/task-contracts';

interface CompletionChangedPayload {
  readonly id: number;
  readonly completed: boolean;
}
interface LoadedPayload {
  readonly tasks: readonly Task[];
}
interface LoadFailedPayload {
  readonly error: string;
}
interface CompletionSavedPayload {
  readonly task: Task;
}
interface CompletionFailedPayload {
  readonly id: number;
  readonly error: string;
}

export const TasksPageActions = createActionGroup({
  source: 'Tasks Page',
  events: {
    Entered: emptyProps(),
    Left: emptyProps(),
    'Retry Requested': emptyProps(),
    'Completion Changed': props<CompletionChangedPayload>(),
  },
});

export const TasksApiActions = createActionGroup({
  source: 'Tasks API',
  events: {
    Loaded: props<LoadedPayload>(),
    'Load Failed': props<LoadFailedPayload>(),
    'Completion Saved': props<CompletionSavedPayload>(),
    'Completion Failed': props<CompletionFailedPayload>(),
  },
});
