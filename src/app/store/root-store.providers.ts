import { isDevMode, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { sanitizeAuthAction } from '../features/auth/store/auth-devtools';
import * as authEffects from '../features/auth/store/auth-effects';
import { authFeature } from '../features/auth/store/auth-feature';

/** Initializes the application Store and its eager features. Call once at bootstrap. */
export function provideRootStore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    // NgRx activates runtime checks only in Angular development mode.
    provideStore(
      {},
      {
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictStateSerializability: true,
          strictActionSerializability: true,
          strictActionTypeUniqueness: true,
          strictActionWithinNgZone: false,
        },
      },
    ),
    // Auth is an eager feature; tasks registers separately in its lazy route.
    provideState(authFeature),
    ...(isDevMode()
      ? [provideStoreDevtools({ maxAge: 25, logOnly: true, actionSanitizer: sanitizeAuthAction })]
      : []),
    provideEffects(authEffects),
  ]);
}
