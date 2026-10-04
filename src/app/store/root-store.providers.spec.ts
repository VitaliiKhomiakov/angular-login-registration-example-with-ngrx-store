import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ACTIVE_RUNTIME_CHECKS, STORE_FEATURES, Store } from '@ngrx/store';
import { INITIAL_OPTIONS } from '@ngrx/store-devtools';
import { appConfig } from '../app.config';
import { sanitizeAuthAction } from '../features/auth/store/auth-devtools';

describe('Root Store composition', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  it('registers auth once at startup and leaves task state to the lazy feature', () => {
    const store = TestBed.inject(Store);
    const registered = TestBed.inject(STORE_FEATURES);
    if (!Array.isArray(registered)) {
      throw new Error('Expected the registered feature list');
    }
    expect(
      registered.map((feature: unknown) => {
        if (typeof feature !== 'object' || feature === null || !('key' in feature)) {
          throw new Error('Expected a feature registration with a key');
        }
        return feature.key;
      }),
    ).toEqual(['auth']);
    expect(store.selectSignal((state: object) => Object.keys(state))()).toEqual(['auth']);
  });

  it('activates all agreed development checks with the zone check disabled', () => {
    TestBed.inject(Store);
    expect(TestBed.inject(ACTIVE_RUNTIME_CHECKS)).toEqual({
      strictStateImmutability: true,
      strictActionImmutability: true,
      strictStateSerializability: true,
      strictActionSerializability: true,
      strictActionTypeUniqueness: true,
      strictActionWithinNgZone: false,
    });
  });

  it('registers bounded, read-only development diagnostics with the auth sanitizer', () => {
    const options = TestBed.inject(INITIAL_OPTIONS);
    expect(options.maxAge).toBe(25);
    expect(options.logOnly).toBe(true);
    expect(options.actionSanitizer).toBe(sanitizeAuthAction);
  });
});
