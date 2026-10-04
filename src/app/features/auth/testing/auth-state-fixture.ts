import type { AuthState } from '../store/auth-state';
import { initialState } from '../store/auth-reducer';

export function authState(overrides: Partial<AuthState> = {}): AuthState {
  return { ...initialState, sessionStatus: 'anonymous', ...overrides };
}
