import { type Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import * as tasksEffects from './store/tasks-effects';
import { tasksFeature } from './store/tasks-feature';

export const tasksRoutes: Routes = [
  {
    path: '',
    providers: [provideState(tasksFeature), provideEffects(tasksEffects)],
    loadComponent: () => import('./pages/tasks-page/tasks-page').then((module) => module.TasksPage),
  },
];
