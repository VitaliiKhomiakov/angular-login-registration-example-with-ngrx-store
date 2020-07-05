import {Injectable} from "@angular/core";
import {throwError} from "rxjs";
import {catchError, map, mergeMap, switchMap, tap} from "rxjs/operators";
import {Actions, createEffect, ofType} from "@ngrx/effects";
import * as authActions from "../actions/auth.actions";
import {AuthService} from "../../services/auth.service";
import {Router} from "@angular/router";
import * as userActions from "../actions/user.actions";
import {Store} from "@ngrx/store";
import {AppState} from "@capacitor/core";

@Injectable()
export class AuthEffects {

  login$ = createEffect(() => this.actions$.pipe(
    ofType(authActions.Login),
    tap(() => this.store$.dispatch(userActions.LoadingUser())),
    switchMap(action => this.authService.login(action.params).pipe(
      tap(tokens => {
        localStorage.setItem('accessToken', tokens.accessToken);
        this.router.navigateByUrl('/core/my-day').then()
      }),
      map(() => userActions.GetProfile()),
      catchError(error => throwError(error))
    ))
  ));

  signUp$ = createEffect(() => this.actions$.pipe(
    ofType(authActions.SignUp),
    mergeMap(action => this.authService.signUp(action.params).pipe(
      tap(res => (!!res.id && this.router.navigateByUrl('/auth/login'))),
      catchError(error => throwError(error))
    ))
  ), { dispatch: false });


  constructor(private actions$: Actions, private authService: AuthService,
              private router: Router, private store$: Store<AppState>) {}
}
