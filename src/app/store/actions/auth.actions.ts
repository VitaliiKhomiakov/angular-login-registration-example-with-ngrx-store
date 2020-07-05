import {createAction, props} from "@ngrx/store";
import * as fromAuthInterface from "../../interfaces/auth.interface";

const TYPE = '[Auth]';

export const Login = createAction(`${TYPE} Login`, props<{params: fromAuthInterface.Login}>());
export const SignUp = createAction(`${TYPE} SignUp`, props<{params: fromAuthInterface.SignUp}>());
