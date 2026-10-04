import { setupWorker } from 'msw/browser';
import { type AppConfig } from '../app/config/app-config';
import { createMockHandlers } from './handlers';

export async function startMocking(config: AppConfig): Promise<void> {
  const worker = setupWorker(...createMockHandlers(config));
  await worker.start({
    quiet: true,
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: new URL('mockServiceWorker.js', document.baseURI).href,
      options: { scope: new URL('.', document.baseURI).pathname },
    },
  });
}
