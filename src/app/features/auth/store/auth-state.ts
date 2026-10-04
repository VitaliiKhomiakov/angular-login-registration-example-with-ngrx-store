import type { User } from '../data-access/auth-contracts';

export type SessionStatus = 'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error';
export type RegistrationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AuthState {
  readonly user: User | null;
  readonly sessionStatus: SessionStatus;
  readonly registrationStatus: RegistrationStatus;
  readonly error: string | null;
  readonly registrationError: string | null;
}
