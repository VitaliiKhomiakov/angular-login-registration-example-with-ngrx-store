import { validateAppConfig } from './app-config';
export const appSettings = validateAppConfig({ mode: 'demo', apiBaseUrl: '/api' });
