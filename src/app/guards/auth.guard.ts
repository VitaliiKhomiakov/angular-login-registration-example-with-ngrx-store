import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {Injectable} from '@angular/core';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!!localStorage.getItem('accessToken')) {
      return true;
    }

    this.router.navigateByUrl('/auth/login').then();
    return false;
  }
}
