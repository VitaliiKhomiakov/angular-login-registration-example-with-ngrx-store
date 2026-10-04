import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { appSettings } from './app/config/app-settings';
import { enableMocking } from './mocks/enable-mocking';

enableMocking(appSettings)
  .then(() => bootstrapApplication(App, appConfig))
  .catch((error: unknown) => {
    console.error('Application bootstrap failed', error);
    const root = document.querySelector('app-root');
    if (root) {
      root.setAttribute('role', 'alert');
      root.textContent =
        'Unable to start the application. Check that mockServiceWorker.js is available and reload the page.';
    }
  });
