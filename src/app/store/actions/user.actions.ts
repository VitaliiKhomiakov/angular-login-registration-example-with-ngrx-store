import {createAction, props} from "@ngrx/store";
import {User} from "../../interfaces/user.interface";

const TYPE = '[User]';

export const GetProfile = createAction(`${TYPE} Get Profile`);
export const SetUser = createAction(`${TYPE} Set User`, props<{user: User}>());
export const LoadingUser = createAction(`${TYPE} Loading User`);
export const ResetUser = createAction(`${TYPE} Reset User`);
