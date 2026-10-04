import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, validateAppConfig } from './app-config';
import { appSettings } from './app-settings';
import { appConfig } from '../app.config';

describe('app settings', () => {
  it('shares the validated bootstrap settings with Angular providers', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    expect(TestBed.inject(APP_CONFIG)).toBe(appSettings);
    expect(Object.isFrozen(appSettings)).toBe(true);
  });

  it('normalizes API prefixes and permits remote HTTP origins', () => {
    expect(validateAppConfig({ mode: 'demo', apiBaseUrl: '/api/' }).apiBaseUrl).toBe('/api');
    expect(
      validateAppConfig({ mode: 'remote', apiBaseUrl: 'https://api.example.test/v1/' }).apiBaseUrl,
    ).toBe('https://api.example.test/v1');
  });

  it.each([
    '',
    '/',
    'api',
    '//external.test/api',
    '/api?secret=x',
    '/api#fragment',
    'javascript:alert(1)',
    'https://user:password@example.test/api',
  ])('rejects invalid API prefix %s', (apiBaseUrl) => {
    expect(() => validateAppConfig({ mode: 'remote', apiBaseUrl })).toThrow();
  });

  it('keeps the demo API on its own origin', () => {
    expect(() =>
      validateAppConfig({ mode: 'demo', apiBaseUrl: 'https://external.test/api' }),
    ).toThrow();
  });
});
