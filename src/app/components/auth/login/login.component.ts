import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import {AppState} from "@capacitor/core";
import {Login} from "../../../store/actions/auth.actions";

@Component({
  selector: 'fit-login',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {

  loginForm = new FormGroup({
    emailOrPhone: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  });

  constructor(private store$: Store<AppState>) {}

  login(): void {
    this.store$.dispatch(Login({params: this.loginForm.value}));
  }

}
