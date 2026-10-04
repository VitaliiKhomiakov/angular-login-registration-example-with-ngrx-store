import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { hostOf } from '../../../../../../testing/ui-test-helpers';
import { TasksPageActions } from '../../store/tasks-actions';
import type { TasksState } from '../../store/tasks-state';
import { TasksPage } from './tasks-page';

const rows = [
  { id: 1, title: 'Review', completed: false },
  { id: 2, title: 'Explore', completed: false },
  { id: 3, title: 'Try', completed: true },
];
const ready: TasksState = { tasks: rows, status: 'ready', pendingTaskId: null, error: null };

function button(host: HTMLElement, label: string): HTMLButtonElement {
  const result = Array.from(host.querySelectorAll('button')).find(
    (item) => item.textContent.trim() === label,
  );
  if (!result) throw new Error(`Expected button ${label}`);
  return result;
}

describe('Tasks page with direct Store signals', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [provideMockStore({ initialState: { tasks: ready } })],
    }),
  );

  it('owns one entry/exit intent and local filters with derived counts', async () => {
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TasksPage);
    await fixture.whenStable();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(TasksPageActions.entered());
    const host = hostOf(fixture);
    expect(host.querySelector('h1')?.textContent).toBe('My tasks');
    expect(document.activeElement).toBe(host.querySelector('h1'));
    expect(host.querySelector('[data-testid="task-counts"]')?.textContent).toContain(
      '2 remaining of 3',
    );
    expect(host.querySelectorAll('app-task-item')).toHaveLength(3);
    button(host, 'Active').click();
    await fixture.whenStable();
    expect(host.querySelectorAll('app-task-item')).toHaveLength(2);
    expect(button(host, 'Active').getAttribute('aria-pressed')).toBe('true');
    button(host, 'Completed').click();
    await fixture.whenStable();
    expect(host.querySelectorAll('app-task-item')).toHaveLength(1);
    expect(host.querySelector('app-task-item')?.textContent).toContain('Try');
    button(host, 'All').click();
    await fixture.whenStable();
    expect(host.querySelectorAll('app-task-item')).toHaveLength(3);
    expect(dispatch).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      TasksPageActions.entered(),
      TasksPageActions.left(),
    ]);
  });

  it('renders asynchronous confirmed saves without manual change detection and blocks pending actions', async () => {
    const store = TestBed.inject<MockStore>(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TasksPage);
    await fixture.whenStable();
    const host = hostOf(fixture);
    button(host, 'Mark complete').click();
    expect(dispatch).toHaveBeenLastCalledWith(
      TasksPageActions.completionChanged({ id: 1, completed: true }),
    );
    store.setState({ tasks: { ...ready, status: 'saving', pendingTaskId: 1 } });
    await fixture.whenStable();
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Saving task');
    const actions = host.querySelectorAll('app-task-item button');
    for (const action of actions) {
      expect(action).toBeInstanceOf(HTMLButtonElement);
      if (!(action instanceof HTMLButtonElement)) throw new Error('Expected task action');
      expect(action.getAttribute('aria-disabled')).toBe('true');
      expect(action.disabled).toBe(false);
      action.click();
    }
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[data-testid="task-counts"]')?.textContent).toContain(
      '2 remaining of 3',
    );
    await Promise.resolve().then(() =>
      store.setState({
        tasks: {
          ...ready,
          tasks: [{ id: 1, title: 'Review', completed: true }, rows[1], rows[2]],
        },
      }),
    );
    await fixture.whenStable();
    expect(host.querySelector('[data-testid="task-counts"]')?.textContent).toContain(
      '1 remaining of 3',
    );
    expect(host.querySelector('[role="status"]')).toBeNull();
    expect(button(host, 'Mark active').disabled).toBe(false);
  });

  it('shows load retry, safe save errors, empty account and empty filter results', async () => {
    const store = TestBed.inject<MockStore>(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TasksPage);
    await fixture.whenStable();
    const host = hostOf(fixture);
    store.setState({
      tasks: { ...ready, status: 'error', error: 'Unable to load your tasks. Please try again.' },
    });
    await fixture.whenStable();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load your tasks',
    );
    button(host, 'Retry loading tasks').click();
    expect(dispatch).toHaveBeenLastCalledWith(TasksPageActions.retryRequested());
    store.setState({ tasks: { ...ready, status: 'loading' } });
    await fixture.whenStable();
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Loading your tasks');
    for (const action of host.querySelectorAll('app-task-item button')) {
      if (!(action instanceof HTMLButtonElement)) throw new Error('Expected task action');
      expect(action.getAttribute('aria-disabled')).toBe('true');
    }
    store.setState({ tasks: { ...ready, error: 'Unable to update this task. Please try again.' } });
    await fixture.whenStable();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to update this task',
    );
    expect(host.textContent).not.toContain('Retry loading tasks');
    button(host, 'Mark complete').click();
    expect(dispatch).toHaveBeenLastCalledWith(
      TasksPageActions.completionChanged({ id: 1, completed: true }),
    );
    store.setState({ tasks: { ...ready, tasks: [] } });
    await fixture.whenStable();
    expect(host.textContent).toContain('No tasks yet');
    expect(host.querySelector('[data-testid="task-counts"]')?.textContent).toContain(
      '0 remaining of 0',
    );
    store.setState({ tasks: { ...ready, tasks: [{ id: 1, title: 'Review', completed: false }] } });
    button(host, 'Completed').click();
    await fixture.whenStable();
    expect(host.textContent).toContain('No tasks match this filter');
  });
});
