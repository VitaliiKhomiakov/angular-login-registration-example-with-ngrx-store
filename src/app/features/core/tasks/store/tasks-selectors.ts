import { createSelector } from '@ngrx/store';
import { tasksFeature } from './tasks-feature';

export const { selectTasks, selectPendingTaskId } = tasksFeature;
export const selectTasksStatus = tasksFeature.selectStatus;
export const selectTasksError = tasksFeature.selectError;
export const selectActiveTasks = createSelector(selectTasks, (tasks) =>
  tasks.filter((task) => !task.completed),
);
export const selectCompletedTasks = createSelector(selectTasks, (tasks) =>
  tasks.filter((task) => task.completed),
);
export const selectRemainingCount = createSelector(selectActiveTasks, (tasks) => tasks.length);
export const selectTotalCount = createSelector(selectTasks, (tasks) => tasks.length);
export const selectIsLoading = createSelector(selectTasksStatus, (status) => status === 'loading');
export const selectIsSaving = createSelector(selectTasksStatus, (status) => status === 'saving');
export const selectIsBusy = createSelector(
  selectIsLoading,
  selectIsSaving,
  (loading, saving) => loading || saving,
);
