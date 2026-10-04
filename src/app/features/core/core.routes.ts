import { type Routes } from '@angular/router';

export const coreRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile-page/profile-page').then((module) => module.ProfilePage),
  },
  {
    path: 'tasks',
    loadChildren: () => import('./tasks/tasks.routes').then((module) => module.tasksRoutes),
  },
];
