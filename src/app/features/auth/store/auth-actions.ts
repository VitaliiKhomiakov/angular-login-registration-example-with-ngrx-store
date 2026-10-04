import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { LoginCredentials, SignUpRequest, User } from '../data-access/auth-contracts';

interface LoginSubmittedPayload {
  readonly credentials: LoginCredentials;
}
interface SignUpSubmittedPayload {
  readonly request: SignUpRequest;
}
interface ProfileLoadedPayload {
  readonly user: User;
}
interface AuthFailurePayload {
  readonly error: string;
}

export const AuthPageActions = createActionGroup({
  source: 'Auth Page',
  events: {
    'Login Submitted': props<LoginSubmittedPayload>(),
    'Sign Up Submitted': props<SignUpSubmittedPayload>(),
    'Logout Requested': emptyProps(),
  },
});

export const AuthSessionActions = createActionGroup({
  source: 'Auth Session',
  events: {
    'Restore Requested': emptyProps(),
    Anonymous: emptyProps(),
    Expired: emptyProps(),
  },
});

export const AuthApiActions = createActionGroup({
  source: 'Auth API',
  events: {
    'Profile Loaded': props<ProfileLoadedPayload>(),
    'Session Failed': props<AuthFailurePayload>(),
    'Sign Up Succeeded': emptyProps(),
    'Sign Up Failed': props<AuthFailurePayload>(),
  },
});
