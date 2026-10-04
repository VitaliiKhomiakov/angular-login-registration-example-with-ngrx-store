import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  disabled,
  email,
  form,
  FormField,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { AuthPageActions } from '../../store/auth-actions';
import { selectRegistrationError, selectRegistrationStatus } from '../../store/auth-selectors';
import type { SignUpRequest } from '../../data-access/auth-contracts';

interface SignUpDraft {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
  readonly confirmPassword: string;
}

@Component({
  selector: 'app-sign-up',
  imports: [
    FormField,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './sign-up-page.html',
  styleUrl: './sign-up-page.scss',
})
export class SignUpPage {
  private readonly store = inject(Store);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly draft = signal<SignUpDraft>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  protected readonly registrationStatus = this.store.selectSignal(selectRegistrationStatus);
  protected readonly isLoading = computed(() => this.registrationStatus() === 'loading');
  protected readonly error = this.store.selectSignal(selectRegistrationError);
  protected readonly signUpForm = form(this.draft, (path) => {
    required(path.firstName, { message: 'Enter your first name' });
    pattern(path.firstName, /\S/, { message: 'Enter your first name' });
    required(path.lastName, { message: 'Enter your last name' });
    pattern(path.lastName, /\S/, { message: 'Enter your last name' });
    required(path.email, { message: 'Enter your email address' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.password, { message: 'Enter your password' });
    required(path.confirmPassword, { message: 'Confirm your password' });
    validate(path.confirmPassword, (context) =>
      context.value() && context.value() !== context.valueOf(path.password)
        ? { kind: 'passwordMismatch', message: 'Passwords do not match.' }
        : undefined,
    );
    disabled(path, () => this.isLoading());
  });

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }

  submitSignUp(): void {
    if (this.isLoading()) return;
    this.signUpForm().markAsTouched();
    if (this.signUpForm().invalid()) {
      this.signUpForm().errorSummary()[0]?.fieldTree().focusBoundControl();
      return;
    }
    const draft = this.draft();
    const phone = draft.phone.trim();
    const request: SignUpRequest = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
      password: draft.password,
      confirmPassword: draft.confirmPassword,
      ...(phone ? { phone } : {}),
    };
    this.store.dispatch(AuthPageActions.signUpSubmitted({ request }));
  }
}
