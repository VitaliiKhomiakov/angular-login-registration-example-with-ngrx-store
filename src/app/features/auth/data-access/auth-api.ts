import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { apiRequestContext } from '../../../http/api-request-context';
import { decodeSignUpResult, decodeTokens, decodeUser } from './auth-decoders';
import type { LoginCredentials, SignUpRequest, SignUpResult, Tokens, User } from './auth-contracts';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  public login(credentials: LoginCredentials): Observable<Tokens> {
    return this.http
      .post<unknown>('/auth/login', credentials, {
        context: apiRequestContext('public'),
      })
      .pipe(map(decodeTokens));
  }
  public signUp(request: SignUpRequest): Observable<SignUpResult> {
    return this.http
      .post<unknown>('/auth/sign-up', request, {
        context: apiRequestContext('public'),
      })
      .pipe(map(decodeSignUpResult));
  }
  public loadProfile(): Observable<User> {
    return this.http
      .get<unknown>('/profile', {
        context: apiRequestContext('authenticated'),
      })
      .pipe(map(decodeUser));
  }
}
