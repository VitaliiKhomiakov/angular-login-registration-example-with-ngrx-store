import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { provideState, provideStore, Store } from '@ngrx/store';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { AuthApiActions, AuthSessionActions } from '../auth/store/auth-actions';
import { authFeature } from '../auth/store/auth-feature';
import { hostOf } from '../../../testing/ui-test-helpers';
import { coreRoutes } from './core.routes';
import { ProfilePage } from './pages/profile-page/profile-page';

describe('Authenticated core area', () => {
  beforeEach(() => {
    // Extend the real private boundary with a test-only sibling that has no guard.
    // Effects are intentionally absent so navigation must enforce session expiry.
    const extendedRoutes: Routes = routes.map((route) =>
      route.loadChildren
        ? {
            ...route,
            loadChildren: undefined,
            children: [...coreRoutes, { path: 'guard-check', component: ProfilePage }],
          }
        : route,
    );
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(extendedRoutes), provideStore(), provideState(authFeature)],
    });
  });

  it('rechecks authentication between private children after the session expires', async () => {
    const store = TestBed.inject(Store);
    const router = TestBed.inject(Router);
    store.dispatch(
      AuthApiActions.profileLoaded({
        user: {
          id: 1,
          email: 'a@example.test',
          firstName: 'A',
          lastName: 'B',
        },
      }),
    );
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/guard-check');
    await fixture.whenStable();
    expect(router.url).toBe('/guard-check');
    expect(hostOf(fixture).querySelector('h1')?.textContent).toBe('Profile');
    expect(hostOf(fixture).querySelector('app-core-layout')).not.toBeNull();
    expect(hostOf(fixture).querySelectorAll('[data-testid="logout"]')).toHaveLength(1);

    await router.navigateByUrl('/profile');
    await fixture.whenStable();
    expect(router.url).toBe('/profile');
    store.dispatch(AuthSessionActions.expired());
    await router.navigateByUrl('/guard-check');
    await fixture.whenStable();
    expect(router.url).toBe('/auth/login');
    expect(hostOf(fixture).querySelector('h1')?.textContent).toBe('Sign in');
    expect(hostOf(fixture).querySelector('app-profile')).toBeNull();
    expect(hostOf(fixture).querySelector('app-core-layout')).toBeNull();
  });

  it('rejects anonymous access to a private child without an individual guard', async () => {
    TestBed.inject(Store).dispatch(AuthSessionActions.anonymous());
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/guard-check');
    await fixture.whenStable();
    expect(router.url).toBe('/auth/login');
    expect(hostOf(fixture).querySelector('h1')?.textContent).toBe('Sign in');
    expect(hostOf(fixture).querySelector('app-profile')).toBeNull();
    expect(hostOf(fixture).querySelector('nav')).toBeNull();
  });
});
