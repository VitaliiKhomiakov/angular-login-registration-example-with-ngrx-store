import { afterNextRender, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { disabled, form, FormField, pattern, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { AuthPageActions, AuthSessionActions } from '../../store/auth-actions';
import { selectError, selectIsLoading, selectRegistrationStatus } from '../../store/auth-selectors';
import type { LoginCredentials } from '../../data-access/auth-contracts';

@Component({
  selector: 'app-login',
  imports: [
    FormField,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly store = inject(Store);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly draft = signal<LoginCredentials>({ emailOrPhone: '', password: '' });
  protected readonly isLoading = this.store.selectSignal(selectIsLoading);
  protected readonly error = this.store.selectSignal(selectError);
  protected readonly registrationStatus = this.store.selectSignal(selectRegistrationStatus);
  protected readonly loginForm = form(this.draft, (path) => {
    required(path.emailOrPhone, { message: 'Enter your email or phone number' });
    pattern(path.emailOrPhone, /\S/, { message: 'Enter your email or phone number' });
    required(path.password, { message: 'Enter your password' });
    disabled(path, () => this.isLoading());
  });

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }

  submitLogin(): void {
    if (this.isLoading()) return;
    this.loginForm().markAsTouched();
    if (this.loginForm().invalid()) {
      this.loginForm().errorSummary()[0]?.fieldTree().focusBoundControl();
      return;
    }
    const { emailOrPhone, password } = this.draft();
    this.store.dispatch(
      AuthPageActions.loginSubmitted({
        credentials: { emailOrPhone: emailOrPhone.trim(), password },
      }),
    );
  }

  retrySession(): void {
    if (!this.isLoading()) this.store.dispatch(AuthSessionActions.restoreRequested());
  }
}
