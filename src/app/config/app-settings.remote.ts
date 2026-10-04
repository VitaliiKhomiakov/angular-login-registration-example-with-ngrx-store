import { validateAppConfig } from './app-config';
// Supply a same-origin API/proxy or change this URL when connecting a real backend.
export const appSettings = validateAppConfig({ mode: 'remote', apiBaseUrl: '/api' });
