import type { Task } from '../app/features/core/tasks/data-access/task-contracts';

/** Page-local server records. New accounts have no tasks; fresh instances restore seeds. */
export class DemoTasks {
  private readonly byUser = new Map<number, readonly Task[]>([
    [
      1,
      [
        { id: 1, title: 'Review the feature structure', completed: false },
        { id: 2, title: 'Explore NgRx selectors', completed: false },
        { id: 3, title: 'Try updating a task', completed: true },
      ],
    ],
  ]);

  public list(userId: number): readonly Task[] {
    return this.byUser.get(userId) ?? [];
  }

  public setCompleted(userId: number, id: number, completed: boolean): Task | undefined {
    const tasks = this.list(userId);
    const task = tasks.find((item) => item.id === id);
    if (!task) return undefined;
    const updated: Task = { ...task, completed };
    this.byUser.set(
      userId,
      tasks.map((item) => (item.id === id ? updated : item)),
    );
    return updated;
  }
}
