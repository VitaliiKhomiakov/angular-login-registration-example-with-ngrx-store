import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ProfilePage } from './profile-page';
import { authState } from '../../../auth/testing/auth-state-fixture';
import { hostOf } from '../../../../../testing/ui-test-helpers';

describe('Profile view', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideMockStore({ initialState: { auth: authState({ sessionStatus: 'loading' }) } }),
      ],
    }),
  );

  it('renders loading then delayed validated user data without manual change detection', async () => {
    const fixture = TestBed.createComponent(ProfilePage);
    const store = TestBed.inject<MockStore>(MockStore);
    await fixture.whenStable();
    expect(hostOf(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'Loading your profile',
    );
    await Promise.resolve().then(() =>
      store.setState({
        auth: authState({
          sessionStatus: 'authenticated',
          user: {
            id: 1,
            firstName: 'Ivan',
            middleName: 'Ivanovich',
            lastName: 'Petrov',
            email: 'ivan@example.test',
            phone: '+380123456789',
          },
        }),
      }),
    );
    await fixture.whenStable();
    expect(hostOf(fixture).textContent).toContain('Ivan Ivanovich Petrov');
    expect(hostOf(fixture).textContent).toContain('ivan@example.test');
    expect(hostOf(fixture).textContent).toContain('+380123456789');
    expect(hostOf(fixture).querySelector('mat-spinner')).toBeNull();
    // The shared private layout owns logout; its spec retains the command assertion.
    expect(hostOf(fixture).querySelector('[data-testid="logout"]')).toBeNull();
  });
});
