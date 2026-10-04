import { InjectionToken } from '@angular/core';

export interface AppConfig {
  readonly mode: 'demo' | 'remote';
  readonly apiBaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export function validateAppConfig(value: AppConfig): AppConfig {
  if (value.mode !== 'demo' && value.mode !== 'remote') throw new Error('Invalid API mode');
  const base = value.apiBaseUrl;
  if (
    typeof base !== 'string' ||
    !base ||
    base.includes('?') ||
    base.includes('#') ||
    base.includes('\\')
  ) {
    throw new Error('Invalid API base URL');
  }
  const relative = base.startsWith('/') && !base.startsWith('//');
  const url = new URL(base, 'https://config.invalid');
  if (
    (!relative && !/^https?:\/\//.test(base)) ||
    url.username ||
    url.password ||
    url.pathname === '/'
  ) {
    throw new Error('Invalid API base URL');
  }
  if (value.mode === 'demo' && !relative)
    throw new Error('Demo API must use an origin-relative URL');
  return Object.freeze({ mode: value.mode, apiBaseUrl: base.replace(/\/+$/, '') });
}
