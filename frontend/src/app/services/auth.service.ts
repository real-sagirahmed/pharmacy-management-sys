import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || '{}'));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/Auth/login`, { username, password })
      .pipe(map(user => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
      }));
  }
  
  hasPermission(moduleName: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean {
    if (this.getRoles().includes('Admin')) return true;
    const permissions = this.currentUserValue.permissions || [];
    const perm = permissions.find((p: any) => p.moduleName === moduleName);
    if (!perm) return false;

    switch (action) {
      case 'view': return perm.canView;
      case 'create': return perm.canCreate;
      case 'edit': return perm.canEdit;
      case 'delete': return perm.canDelete;
      default: return false;
    }
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next({});
  }

  isLoggedIn(): boolean {
    return !!this.currentUserValue.token;
  }

  getRoles(): string[] {
    return this.currentUserValue.roles || [];
  }

  register(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/Auth/register`, data, { responseType: 'text' });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/Auth/forgot-password`, { email });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/Auth/reset-password`, data);
  }
}
