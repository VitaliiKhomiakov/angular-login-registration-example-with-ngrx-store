import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, map, mergeMap} from 'rxjs/operators';
import {throwError} from 'rxjs';
import {UserService} from '../../services/user.service';
import * as userActions from '../actions/user.actions';

@Injectable()
export class UserEffects {

  getProfile$ = createEffect(() => this.actions$.pipe(
    ofType(userActions.GetProfile),
    mergeMap(() => this.userService.getProfile().pipe(
      map(user => userActions.SetUser({user})),
      catchError(error => throwError(error))
    ))
  ));

  constructor(private actions$: Actions, private userService: UserService) {}
}
