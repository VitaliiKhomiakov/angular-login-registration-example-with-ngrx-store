import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { SignUpPage } from './sign-up-page';
import { AuthPageActions } from '../../store/auth-actions';
import { authState } from '../../testing/auth-state-fixture';
import { fill, hostOf, inputOf, submit } from '../../../../../testing/ui-test-helpers';

const request = {
  firstName: 'Ivan',
  lastName: 'Petrov',
  email: 'ivan@example.test',
  password: 'secret',
  confirmPassword: 'secret',
};

describe('Sign-up form', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [SignUpPage],
      providers: [provideRouter([]), provideMockStore({ initialState: { auth: authState() } })],
    }),
  );

  it('requires all mandatory fields and does not dispatch an empty form', async () => {
    const fixture = TestBed.createComponent(SignUpPage);
    const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    await fixture.whenStable();
    await submit(fixture);
    expect(dispatch).not.toHaveBeenCalled();
    const content = hostOf(fixture).textContent;
    for (const message of [
      'Enter your first name',
      'Enter your last name',
      'Enter your email address',
      'Enter your password',
      'Confirm your password',
    ])
      expect(content).toContain(message);
  });

  it.each([
    [{ email: 'invalid-email' }, 'Enter a valid email address'],
    [{ confirmPassword: 'different' }, 'Passwords do not match'],
  ])('blocks invalid input %j', async (changes, message) => {
    const fixture = TestBed.createComponent(SignUpPage);
    const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    await fixture.whenStable();
    await fill(fixture, { ...request, ...changes });
    await submit(fixture);
    expect(dispatch).not.toHaveBeenCalled();
    expect(hostOf(fixture).textContent).toContain(message);
  });

  it('revalidates confirmation after password changes and maps optional phone only when present', async () => {
    const fixture = TestBed.createComponent(SignUpPage);
    const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    await fixture.whenStable();
    await fill(fixture, request);
    await fill(fixture, { password: 'changed' });
    await submit(fixture);
    expect(dispatch).not.toHaveBeenCalled();
    await fill(fixture, { confirmPassword: 'changed', phone: ' +380123456789 ' });
    await submit(fixture);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      AuthPageActions.signUpSubmitted({
        request: {
          ...request,
          password: 'changed',
          confirmPassword: 'changed',
          phone: '+380123456789',
        },
      }),
    );
  });

  it('uses registration pending independently, blocks duplicates and preserves a failed draft', async () => {
    const fixture = TestBed.createComponent(SignUpPage);
    const store = TestBed.inject<MockStore>(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    await fixture.whenStable();
    await fill(fixture, request);
    await Promise.resolve().then(() =>
      store.setState({ auth: authState({ registrationStatus: 'loading' }) }),
    );
    await fixture.whenStable();
    expect(hostOf(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'Creating your account',
    );
    expect(inputOf(hostOf(fixture), 'email').disabled).toBe(true);
    await submit(fixture);
    expect(dispatch).not.toHaveBeenCalled();
    await Promise.resolve().then(() =>
      store.setState({
        auth: authState({
          sessionStatus: 'loading',
          registrationStatus: 'error',
          registrationError: 'This email is already registered.',
        }),
      }),
    );
    await fixture.whenStable();
    expect(hostOf(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'This email is already registered',
    );
    expect(hostOf(fixture).querySelector('mat-spinner')).toBeNull();
    expect(inputOf(hostOf(fixture), 'password').value).toBe(request.password);
    await submit(fixture);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(AuthPageActions.signUpSubmitted({ request }));
  });
});
