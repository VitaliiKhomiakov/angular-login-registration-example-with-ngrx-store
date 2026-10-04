import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AuthPageActions } from '../../auth/store/auth-actions';
import { hostOf } from '../../../../testing/ui-test-helpers';
import { CoreLayout } from './core-layout';

describe('Shared private layout', () => {
  it('owns private navigation and the transferred logout command/control', async () => {
    TestBed.configureTestingModule({
      imports: [CoreLayout],
      providers: [provideRouter([]), provideMockStore()],
    });
    const fixture = TestBed.createComponent(CoreLayout);
    const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    await fixture.whenStable();
    const host = hostOf(fixture);
    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Account navigation');
    expect(
      Array.from(host.querySelectorAll('nav a')).map((link) => link.getAttribute('href')),
    ).toEqual(['/profile', '/tasks']);
    expect(host.querySelector('router-outlet')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid="logout"]')).toHaveLength(1);
    const logout = host.querySelector('[data-testid="logout"]');
    if (!(logout instanceof HTMLButtonElement)) throw new Error('Expected logout button');
    logout.click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(AuthPageActions.logoutRequested());
  });
});
