import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideState, provideStore, Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { AuthApiActions, AuthPageActions, AuthSessionActions } from '../store/auth-actions';
import { authFeature } from '../store/auth-feature';
import { authGuard } from './auth-guard';

describe('Auth guard settlement', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideStore(), provideState(authFeature)],
    }),
  );

  it.each(['unknown', 'loading'] as const)(
    'waits for %s and allows authenticated session without dispatching restore',
    async (status) => {
      const store = TestBed.inject(Store);
      if (status === 'loading') store.dispatch(AuthSessionActions.restoreRequested());
      const dispatch = vi.spyOn(store, 'dispatch');
      const result = TestBed.runInInjectionContext(() => authGuard());
      let settled = false;
      const promise = firstValueFrom(result).then((value) => {
        settled = true;
        return value;
      });
      await Promise.resolve();
      expect(settled).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
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
      await expect(promise).resolves.toBe(true);
    },
  );

  it.each(['anonymous', 'error'] as const)(
    'returns a login UrlTree for %s without imperative navigation',
    async (status) => {
      const store = TestBed.inject(Store);
      const router = TestBed.inject(Router);
      const navigate = vi.spyOn(router, 'navigate');
      store.dispatch(AuthSessionActions.restoreRequested());
      const promise = firstValueFrom(TestBed.runInInjectionContext(() => authGuard()));
      if (status === 'anonymous') store.dispatch(AuthPageActions.logoutRequested());
      else store.dispatch(AuthApiActions.sessionFailed({ error: 'Offline' }));
      const outcome = await promise;
      expect(outcome).not.toBe(true);
      if (typeof outcome === 'boolean') throw new Error('Expected the login UrlTree');
      expect(router.serializeUrl(outcome)).toBe('/auth/login');
      expect(navigate).not.toHaveBeenCalled();
    },
  );
});
