import { type AppConfig } from '../app/config/app-config';

export interface BrowserMocks {
  readonly startMocking: (config: AppConfig) => Promise<void>;
}

export async function enableMocking(
  config: AppConfig,
  loadBrowser: () => Promise<BrowserMocks> = () => import('./browser'),
): Promise<void> {
  if (config.mode === 'remote') return;
  const { startMocking } = await loadBrowser();
  await startMocking(config);
}
