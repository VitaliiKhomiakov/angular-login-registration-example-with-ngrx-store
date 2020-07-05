import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import {AppState} from "@capacitor/core";
import {SignUp} from "../../../store/actions/auth.actions";

@Component({
  selector: 'fit-sign-up',
  templateUrl: 'sign-up.component.html',
  styleUrls: ['sign-up.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignUpComponent {

  signUpForm = new FormGroup({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl(''),
    password: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  constructor(private store$: Store<AppState>) {}

  signUp(): void {
    this.store$.dispatch(SignUp({params: this.signUpForm.value}))
  }

}
