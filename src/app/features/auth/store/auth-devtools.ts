import type { Action } from '@ngrx/store';
import { AuthPageActions } from './auth-actions';

export function sanitizeAuthAction(action: Action): Action {
  if (action.type === AuthPageActions.loginSubmitted.type) {
    return AuthPageActions.loginSubmitted({
      credentials: {
        emailOrPhone: '[REDACTED]',
        password: '[REDACTED]',
      },
    });
  }
  if (action.type === AuthPageActions.signUpSubmitted.type) {
    return AuthPageActions.signUpSubmitted({
      request: {
        firstName: '[REDACTED]',
        lastName: '[REDACTED]',
        email: '[REDACTED]',
        password: '[REDACTED]',
        confirmPassword: '[REDACTED]',
      },
    });
  }
  return action;
}
