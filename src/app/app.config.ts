import {
  inject,
  type ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './http/api-interceptor';
import { AuthSessionActions } from './features/auth/store/auth-actions';
import { provideRootStore } from './store/root-store.providers';
import { APP_CONFIG } from './config/app-config';
import { appSettings } from './config/app-settings';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideRootStore(),
    provideAppInitializer(() => {
      inject(Store).dispatch(AuthSessionActions.restoreRequested());
    }),
    { provide: APP_CONFIG, useValue: appSettings },
    provideHttpClient(withInterceptors([apiInterceptor])),
  ],
};
