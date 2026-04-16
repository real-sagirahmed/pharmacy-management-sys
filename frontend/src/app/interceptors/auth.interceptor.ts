import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor() { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Current user metadata might be in memory, but JWT is in a secure cookie.
    // We must set withCredentials: true so the browser sends the cookie.
    request = request.clone({
      withCredentials: true
    });

    return next.handle(request);
  }
}
