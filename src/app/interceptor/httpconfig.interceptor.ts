import {Injectable} from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {Router} from '@angular/router';
import {ConfigService} from "../services/config.service";

@Injectable()
export class HttpConfigInterceptor implements HttpInterceptor {

  constructor(private router: Router, private configService: ConfigService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const accessToken = localStorage.getItem('accessToken');

    request = request.clone({
      headers: request.headers.set('Authorization', `Bearer ${accessToken}`),
      url: `${this.configService.get('HOST_API')}${request.url}`
    });

    if (!request.headers.has('Content-Type')) {
      request = request.clone({headers: request.headers.set('Content-Type', 'application/json')});
    }

    request = request.clone({headers: request.headers.set('Accept', 'application/json')});

    return next.handle(request).pipe(
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          // console.log('event--->>>', event);
        }
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.router.navigateByUrl('/auth/login').then();
        }
        return throwError(error);
      }));
  }
}
