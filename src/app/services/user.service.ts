import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {User} from "../interfaces/user.interface";

@Injectable()
export class UserService {
  constructor(private http: HttpClient) { }

  getProfile(): Observable<User> {
    return this.http.get<User>('/profile');
  }
}
