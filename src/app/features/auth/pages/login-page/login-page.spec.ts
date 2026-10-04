import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { LoginPage } from './login-page';
import { AuthPageActions, AuthSessionActions } from '../../store/auth-actions';
import { authState } from '../../testing/auth-state-fixture';
import { fill, hostOf, inputOf, submit } from '../../../../../testing/ui-test-helpers';
import { App } from '../../../../app';
import { appConfig } from '../../../../app.config';

const credentials = { emailOrPhone: 'demo@example.test', password: 'demo-password' };

describe('Login form', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideMockStore({ initialState: { auth: authState() } })],
    }),
  );

  it('marks required fields on submit and does not dispatch invalid credentials', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    await fixture.whenStable();
    await submit(fixture);
    expect(dispatch).not.toHaveBeenCalled();
    expect(hostOf(fixture).textContent).toContain('Enter your email or phone number');
    expect(hostOf(fixture).textContent).toContain('Enter your password');
  });

  it('uses one native submit path with a typed payload, including a phone login', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    await fixture.whenStable();
    await fill(fixture, { ...credentials, emailOrPhone: '+380123456789' });
    // Keyboard default submission is checked in Chromium; keyup must not dispatch.
    inputOf(hostOf(fixture), 'password').dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }),
    );
    expect(dispatch).not.toHaveBeenCalled();
    await submit(fixture);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      AuthPageActions.loginSubmitted({
        credentials: { ...credentials, emailOrPhone: '+380123456789' },
      }),
    );
  });

  it('renders pending, blocks repeated submit and keeps inputs after an asynchronous failure', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const store = TestBed.inject<MockStore>(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    await fixture.whenStable();
    await fill(fixture, credentials);
    await Promise.resolve().then(() =>
      store.setState({ auth: authState({ sessionStatus: 'loading' }) }),
    );
    await fixture.whenStable();
    expect(hostOf(fixture).querySelector('[role="status"]')?.textContent).toContain('Signing in');
    expect(inputOf(hostOf(fixture), 'password').disabled).toBe(true);
    await submit(fixture);
    await submit(fixture);
    expect(dispatch).not.toHaveBeenCalled();
    await Promise.resolve().then(() =>
      store.setState({ auth: authState({ sessionStatus: 'error', error: 'Sign-in error' }) }),
    );
    await fixture.whenStable();
    expect(hostOf(fixture).querySelector('[role="alert"]')?.textContent).toContain('Sign-in error');
    expect(hostOf(fixture).querySelector('mat-spinner')).toBeNull();
    expect(inputOf(hostOf(fixture), 'password').value).toBe(credentials.password);
    expect(inputOf(hostOf(fixture), 'password').disabled).toBe(false);
    await submit(fixture);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      AuthPageActions.loginSubmitted({ credentials }),
    );
  });

  it('retries restoration through its session action', async () => {
    TestBed.inject<MockStore>(MockStore).setState({
      auth: authState({ sessionStatus: 'error', error: 'Session restoration failed' }),
    });
    const fixture = TestBed.createComponent(LoginPage);
    const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    await fixture.whenStable();
    const button = hostOf(fixture).querySelector('[data-testid="retry-session"]');
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected retry button');
    button.click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(AuthSessionActions.restoreRequested());
  });

  it('shows delayed registration success and does not update a destroyed view', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const store = TestBed.inject<MockStore>(MockStore);
    await fixture.whenStable();
    await Promise.resolve().then(() =>
      store.setState({ auth: authState({ registrationStatus: 'success' }) }),
    );
    await fixture.whenStable();
    expect(hostOf(fixture).textContent).toContain('Registration complete');
    fixture.destroy();
    const destroyedContent = hostOf(fixture).textContent;
    store.setState({ auth: authState({ error: 'Late error', sessionStatus: 'error' }) });
    await fixture.whenStable();
    expect(hostOf(fixture).textContent).toBe(destroyedContent);
  });
});

describe('Form to profile with the real application providers', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  it('submits once, displays a delayed profile without detectChanges and resets the login draft after logout', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const backend = TestBed.inject(HttpTestingController);
    await router.navigateByUrl('/auth/login');
    await fixture.whenStable();
    await fill(fixture, credentials);
    await submit(fixture);
    const login = backend.expectOne('/api/auth/login');
    expect(login.request.body).toEqual(credentials);
    await submit(fixture);
    backend.expectNone('/api/auth/login');
    expect(hostOf(fixture).querySelector('mat-spinner')).not.toBeNull();
    login.flush({ accessToken: 'new-token' });
    backend
      .expectOne('/api/profile')
      .flush({ id: 1, email: 'demo@example.test', firstName: 'Demo', lastName: 'User' });
    await fixture.whenStable();
    expect(router.url).toBe('/profile');
    expect(hostOf(fixture).textContent).toContain('Demo User');
    const logout = hostOf(fixture).querySelector('[data-testid="logout"]');
    if (!(logout instanceof HTMLButtonElement)) throw new Error('Expected logout button');
    logout.click();
    await fixture.whenStable();
    expect(router.url).toBe('/auth/login');
    expect(inputOf(hostOf(fixture), 'emailOrPhone').value).toBe('');
    expect(inputOf(hostOf(fixture), 'password').value).toBe('');
    expect(sessionStorage.getItem('angular-ngrx-demo.session-token')).toBeNull();
  });
});
