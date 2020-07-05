import {User} from "../../interfaces/user.interface";
import {Statuses} from "../../app.constants";
import {Action, createReducer, on} from "@ngrx/store";
import * as userActions from "../actions/user.actions";


export interface UserState {
  data: User;
  status: Statuses
}

export const initialState: UserState = {
  data: null,
  status: Statuses.UNINITIALIZED
};

const user = createReducer(
  initialState,
  on(userActions.SetUser, (state, payload) => {
    return {
      ...state,
      data: payload.user,
      status: Statuses.LOADED
    };
  }),
  on(userActions.LoadingUser, (state) => {
    return {
      ...state,
      data: null,
      status: Statuses.LOADING
    }
  }),
  on(userActions.ResetUser, (state => ({...state, data: null, status: Statuses.UNINITIALIZED})))
);

export function userReducer(state: UserState | undefined, action: Action) {
  return user(state, action);
}
