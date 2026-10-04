import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { TasksPageActions } from '../../store/tasks-actions';
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
} from '../../store/tasks-selectors';
import { TaskItem } from '../../components/task-item/task-item';

type TasksFilter = 'all' | 'active' | 'completed';

@Component({
  selector: 'app-tasks-page',
  imports: [MatButtonModule, MatProgressSpinnerModule, TaskItem],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
})
export class TasksPage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly tasks = this.store.selectSignal(selectTasks);
  private readonly activeTasks = this.store.selectSignal(selectActiveTasks);
  private readonly completedTasks = this.store.selectSignal(selectCompletedTasks);
  protected readonly filter = signal<TasksFilter>('all');
  protected readonly status = this.store.selectSignal(selectTasksStatus);
  protected readonly error = this.store.selectSignal(selectTasksError);
  protected readonly remainingCount = this.store.selectSignal(selectRemainingCount);
  protected readonly totalCount = this.store.selectSignal(selectTotalCount);
  protected readonly isLoading = this.store.selectSignal(selectIsLoading);
  protected readonly isSaving = this.store.selectSignal(selectIsSaving);
  protected readonly isBusy = this.store.selectSignal(selectIsBusy);
  protected readonly pendingTaskId = this.store.selectSignal(selectPendingTaskId);
  protected readonly visibleTasks = computed(() => {
    switch (this.filter()) {
      case 'active':
        return this.activeTasks();
      case 'completed':
        return this.completedTasks();
      default:
        return this.tasks();
    }
  });

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }

  ngOnInit(): void {
    this.store.dispatch(TasksPageActions.entered());
  }
  ngOnDestroy(): void {
    this.store.dispatch(TasksPageActions.left());
  }

  setFilter(filter: TasksFilter): void {
    this.filter.set(filter);
  }

  changeCompletion(id: number, completed: boolean): void {
    if (!this.isBusy()) this.store.dispatch(TasksPageActions.completionChanged({ id, completed }));
  }

  retry(): void {
    if (this.status() === 'error') this.store.dispatch(TasksPageActions.retryRequested());
  }
}
