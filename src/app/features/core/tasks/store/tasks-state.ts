import type { Task } from '../data-access/task-contracts';

export type TasksStatus = 'idle' | 'loading' | 'saving' | 'ready' | 'error';

export interface TasksState {
  readonly tasks: readonly Task[];
  readonly status: TasksStatus;
  readonly pendingTaskId: number | null;
  readonly error: string | null;
}
