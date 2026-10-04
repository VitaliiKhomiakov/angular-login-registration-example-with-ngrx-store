import type { Task } from './task-contracts';

export class TasksApiContractError extends Error {
  public constructor() {
    super('Invalid tasks API contract');
    this.name = 'TasksApiContractError';
  }
}

export function decodeTask(value: unknown): Task {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('id' in value) ||
    !('title' in value) ||
    !('completed' in value)
  ) {
    throw new TasksApiContractError();
  }
  const { id, title, completed } = value;
  if (
    typeof id !== 'number' ||
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    typeof title !== 'string' ||
    !title.trim() ||
    title.length > 120 ||
    typeof completed !== 'boolean'
  ) {
    throw new TasksApiContractError();
  }
  return { id, title, completed };
}

export function decodeTasks(value: unknown): readonly Task[] {
  if (!Array.isArray(value)) throw new TasksApiContractError();
  const seen = new Set<number>();
  return value.map((item: unknown) => {
    const task = decodeTask(item);
    if (seen.has(task.id)) throw new TasksApiContractError();
    seen.add(task.id);
    return task;
  });
}
