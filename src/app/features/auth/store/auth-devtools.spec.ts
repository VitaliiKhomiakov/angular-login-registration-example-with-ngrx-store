import { AuthPageActions, AuthSessionActions } from './auth-actions';
import { sanitizeAuthAction } from './auth-devtools';

describe('Auth DevTools boundary', () => {
  it('redacts login credentials without mutating the original action', () => {
    const original = Object.freeze(
      AuthPageActions.loginSubmitted({
        credentials: Object.freeze({
          emailOrPhone: 'private@example.test',
          password: 'private-password',
        }),
      }),
    );
    const sanitized = sanitizeAuthAction(original);
    expect(sanitized).toEqual(
      AuthPageActions.loginSubmitted({
        credentials: {
          emailOrPhone: '[REDACTED]',
          password: '[REDACTED]',
        },
      }),
    );
    expect(original.credentials.password).toBe('private-password');
    expect(original.credentials.emailOrPhone).toBe('private@example.test');
  });

  it('redacts registration including confirmation and optional personal data without mutation', () => {
    const original = Object.freeze(
      AuthPageActions.signUpSubmitted({
        request: Object.freeze({
          firstName: 'Private',
          lastName: 'Person',
          middleName: 'Private',
          phone: '123',
          email: 'private@example.test',
          password: 'secret',
          confirmPassword: 'secret',
        }),
      }),
    );
    const sanitized = sanitizeAuthAction(original);
    expect(sanitized).toEqual(
      AuthPageActions.signUpSubmitted({
        request: {
          firstName: '[REDACTED]',
          lastName: '[REDACTED]',
          email: '[REDACTED]',
          password: '[REDACTED]',
          confirmPassword: '[REDACTED]',
        },
      }),
    );
    expect(JSON.stringify(sanitized)).not.toContain('Private');
    expect(original.request.confirmPassword).toBe('secret');
    expect(original.request.middleName).toBe('Private');
  });

  it('keeps unrelated events intact', () => {
    const action = AuthSessionActions.anonymous();
    expect(sanitizeAuthAction(action)).toBe(action);
  });
});
