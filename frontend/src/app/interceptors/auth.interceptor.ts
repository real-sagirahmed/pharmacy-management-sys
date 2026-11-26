import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SELECTED_BRANCH_STORAGE_KEY } from '../services/tenant-config.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor() { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // JWT is stored in HttpOnly cookie; multi-branch Admins also forward active X-Branch-Id cleanly without circular DI.
    const selectedBranchId = localStorage.getItem(SELECTED_BRANCH_STORAGE_KEY);
    const parsedBranchId = selectedBranchId ? Number(selectedBranchId) : 0;

    const cloneInit: { withCredentials: boolean; setHeaders?: Record<string, string> } = {
      withCredentials: true
    };
    if (Number.isInteger(parsedBranchId) && parsedBranchId > 0) {
      cloneInit.setHeaders = { 'X-Branch-Id': String(parsedBranchId) };
    }

    request = request.clone(cloneInit);
    return next.handle(request);
  }
}
