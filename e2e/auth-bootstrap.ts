// Only the acceptance build replaces src/main.ts with this file.
import { HttpClient } from '@angular/common/http';
import { type ApplicationRef } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { firstValueFrom } from 'rxjs';
import { App } from '../src/app/app';
import { appConfig } from '../src/app/app.config';
import { AuthPageActions } from '../src/app/features/auth/store/auth-actions';
import { authFeature } from '../src/app/features/auth/store/auth-feature';
import type { AuthState } from '../src/app/features/auth/store/auth-state';
import { appSettings } from '../src/app/config/app-settings';
import { createMockHandlers } from '../src/mocks/handlers';
import { enableMocking } from '../src/mocks/enable-mocking';
import { type AuthAcceptanceHarness, type ProfileOutcome } from './auth-browser-contracts';

interface AuthRootState {
  readonly auth: AuthState;
}
interface ProfileGate {
  readonly arrived: Promise<void>;
  readonly finished: Promise<void>;
  readonly release: () => void;
}

const worker = setupWorker(...createMockHandlers(appSettings));
let application: ApplicationRef | undefined;
let activeGate: ProfileGate | undefined;

function app(): ApplicationRef {
  if (!application) throw new Error('Acceptance application is not ready');
  return application;
}

function store(): Store<AuthRootState> {
  return app().injector.get<Store<AuthRootState>>(Store);
}

function gateNextProfile(outcome: ProfileOutcome): void {
  if (activeGate) throw new Error('Release the current profile gate first');
  let arrive = (): void => {
    throw new Error('Gate not initialized');
  };
  let release = arrive;
  let finish = arrive;
  const arrived = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  activeGate = { arrived, finished, release };
  worker.use(
    http.get(
      new URL(`${appSettings.apiBaseUrl}/profile`, location.origin).href,
      async () => {
        arrive();
        await released;
        worker.resetHandlers();
        // The resolver completes even if Angular already aborted the old XHR.
        finish();
        if (outcome === 'unavailable')
          return HttpResponse.json({ message: 'Unavailable' }, { status: 503 });
        if (outcome === 'malformed')
          return HttpResponse.json({ id: 'invalid', password: 'must-not-reach-state-or-error' });
        return HttpResponse.json({
          id: 1,
          email: 'demo@example.test',
          firstName: 'Demo',
          lastName: 'User',
        });
      },
      { once: true },
    ),
  );
}

const harness: AuthAcceptanceHarness = {
  gateNextProfile,
  waitForProfile: () => {
    if (!activeGate) throw new Error('No profile gate');
    return activeGate.arrived;
  },
  releaseProfile: async () => {
    if (!activeGate) throw new Error('No profile gate');
    const gate = activeGate;
    gate.release();
    await gate.finished;
    activeGate = undefined;
  },
  logout: () => store().dispatch(AuthPageActions.logoutRequested()),
  snapshot: () => store().selectSignal(authFeature.selectAuthState)(),
  navigate: (url) => app().injector.get(Router).navigateByUrl(url),
  getText: async (url) => {
    try {
      await firstValueFrom(app().injector.get(HttpClient).get(url, { responseType: 'text' }));
      return 'ok';
    } catch {
      return 'error';
    }
  },
};

const initialOutcome = new URL(location.href).searchParams.get('acceptanceProfile');
if (initialOutcome === 'unavailable') gateNextProfile(initialOutcome);

async function bootstrapAcceptance(): Promise<void> {
  await enableMocking(appSettings, () =>
    Promise.resolve({
      startMocking: async () => {
        await worker.start({
          quiet: true,
          onUnhandledRequest: 'bypass',
          serviceWorker: {
            url: new URL('mockServiceWorker.js', document.baseURI).href,
            options: { scope: new URL('.', document.baseURI).pathname },
          },
        });
      },
    }),
  );
  application = await bootstrapApplication(App, appConfig);
  Object.defineProperty(window, 'authAcceptance', { value: harness });
}

bootstrapAcceptance().catch((error: unknown) => {
  console.error('Acceptance bootstrap failed', error);
});
