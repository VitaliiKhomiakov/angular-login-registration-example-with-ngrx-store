import { HttpContext, HttpContextToken } from '@angular/common/http';

export type ApiRequestAccess = 'public' | 'authenticated';

// null leaves assets, third-party calls and other unmanaged requests untouched.
export const API_REQUEST_ACCESS = new HttpContextToken<ApiRequestAccess | null>(() => null);

export function apiRequestContext(access: ApiRequestAccess): HttpContext {
  return new HttpContext().set(API_REQUEST_ACCESS, access);
}
