import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { SessionTokenStorage } from '../session/session-token-storage';
import { API_REQUEST_ACCESS } from './api-request-context';

// Endpoint names belong to features. This boundary only checks that a marked
// request cannot change the destination or escape the configured API base.
function isApiPath(url: string): boolean {
  if (!url.startsWith('/') || /[\\#\s]|\p{Cc}/u.test(url)) return false;
  const path = url.split('?')[0] ?? '';
  try {
    return path
      .slice(1)
      .split('/')
      .every((segment) => {
        const decoded = decodeURIComponent(segment);
        return (
          decoded !== '' &&
          decoded !== '.' &&
          decoded !== '..' &&
          !/[/\\%?#\s]|\p{Cc}/u.test(decoded)
        );
      });
  } catch {
    return false;
  }
}

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const access = request.context.get(API_REQUEST_ACCESS);
  if (access === null) return next(request);
  if (!isApiPath(request.url)) return throwError(() => new Error('Invalid API request path'));

  const config = inject(APP_CONFIG);
  const token = access === 'authenticated' ? inject(SessionTokenStorage).read()?.trim() : null;
  const headers = token
    ? request.headers.set('Authorization', `Bearer ${token}`)
    : request.headers.delete('Authorization');
  return next(request.clone({ url: `${config.apiBaseUrl}${request.url}`, headers }));
};
