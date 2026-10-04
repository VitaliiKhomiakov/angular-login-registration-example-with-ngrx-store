import { createFeature } from '@ngrx/store';
import { authReducer } from './auth-reducer';

export const authFeature = createFeature({
  name: 'auth',
  reducer: authReducer,
});
