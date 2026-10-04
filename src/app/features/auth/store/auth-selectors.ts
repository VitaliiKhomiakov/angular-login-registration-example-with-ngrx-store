import { createSelector } from '@ngrx/store';
import { authFeature } from './auth-feature';

export const {
  selectUser,
  selectSessionStatus,
  selectError,
  selectRegistrationStatus,
  selectRegistrationError,
} = authFeature;

export const selectIsLoading = createSelector(
  selectSessionStatus,
  (status) => status === 'loading',
);
export const selectIsAuthenticated = createSelector(
  selectSessionStatus,
  (status) => status === 'authenticated',
);
