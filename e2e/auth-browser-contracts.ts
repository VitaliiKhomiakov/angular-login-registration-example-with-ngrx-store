import type { AuthState } from '../src/app/features/auth/store/auth-state';

export type ProfileOutcome = 'success' | 'unavailable' | 'malformed';

export interface AuthAcceptanceHarness {
  readonly gateNextProfile: (outcome: ProfileOutcome) => void;
  readonly waitForProfile: () => Promise<void>;
  readonly releaseProfile: () => Promise<void>;
  readonly logout: () => void;
  readonly snapshot: () => AuthState;
  readonly navigate: (url: string) => Promise<boolean>;
  readonly getText: (url: string) => Promise<'ok' | 'error'>;
}

declare global {
  interface Window {
    readonly authAcceptance: AuthAcceptanceHarness;
  }
}
