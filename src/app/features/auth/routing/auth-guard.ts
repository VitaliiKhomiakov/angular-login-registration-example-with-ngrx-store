import { inject } from '@angular/core';
import { Router, type CanActivateChildFn, type CanActivateFn, type UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take, type Observable } from 'rxjs';
import { selectSessionStatus } from '../store/auth-selectors';

export const authGuard = ((): Observable<boolean | UrlTree> => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectSessionStatus).pipe(
    filter((status) => status !== 'unknown' && status !== 'loading'),
    take(1),
    map((status) => (status === 'authenticated' ? true : router.createUrlTree(['/auth/login']))),
  );
}) satisfies CanActivateFn & CanActivateChildFn;
