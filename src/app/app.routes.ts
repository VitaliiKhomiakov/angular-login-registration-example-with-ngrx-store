import { type Routes } from '@angular/router';
import { authGuard } from './features/auth/routing/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page').then((module) => module.LoginPage),
  },
  {
    path: 'auth/sign-up',
    loadComponent: () =>
      import('./features/auth/pages/sign-up-page/sign-up-page').then((module) => module.SignUpPage),
  },
  { path: 'core/my-day', pathMatch: 'full', redirectTo: 'profile' },
  {
    path: '',
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./features/core/layout/core-layout').then((module) => module.CoreLayout),
    loadChildren: () => import('./features/core/core.routes').then((module) => module.coreRoutes),
  },
  { path: '**', redirectTo: 'auth/login' },
];
