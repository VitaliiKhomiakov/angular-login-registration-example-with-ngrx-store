import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Login, SignUp, Tokens} from "../interfaces/auth.interface";
import {User} from "../interfaces/user.interface";

interface SignedUp {
  id: number;
  status: string;
}

@Injectable()
export class AuthService {
  constructor(private http: HttpClient) { }

  login(loginParams: Login): Observable<Tokens> {
    return this.http.post<Tokens>('/auth/login', loginParams);
  }

  signUp(signUpParams: SignUp): Observable<SignedUp> {
    return this.http.post<SignedUp>('/auth/sign-up', signUpParams);
  }
}
