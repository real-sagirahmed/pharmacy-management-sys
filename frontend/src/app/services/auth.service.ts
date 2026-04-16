import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, of, tap } from 'rxjs';
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
        // user metadata saved, but no token as it's now HttpOnly Cookie
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
      }));
  }

  updateCachedUser(updatedFields: any) {
    const merged = { ...this.currentUserValue, ...updatedFields };
    localStorage.setItem('currentUser', JSON.stringify(merged));
    this.currentUserSubject.next(merged);
  }

  getProfileImageUrl(path: string | null): string | null {
    if (!path) return null;
    // apiUrl is http://localhost:5171/api, we need http://localhost:5171
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${path}`;
  }
  
  hasPermission(moduleName: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean {
    // ONLY SystemAdmin has full global access (Owner Bypass)
    if (this.isSystemAdmin()) return true;

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
    return this.http.post(`${environment.apiUrl}/Auth/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next({});
      }),
      map(() => true)
    ).subscribe();
  }

  isLoggedIn(): boolean {
    // Check if user ID or Username exists, since token is now in a secure cookie
    return !!this.currentUserValue?.id || !!this.currentUserValue?.userName;
  }

  getRoles(): string[] {
    return this.currentUserValue.roles || [];
  }

  // ─── SystemAdmin Helpers ───────────────────────────────────────────────────

  /** Returns true if the current logged-in user has the SystemAdmin role */
  isSystemAdmin(): boolean {
    return this.getRoles().includes('SystemAdmin');
  }

  /** Returns the current logged-in user's username */
  getUsername(): string | undefined {
    return this.currentUserValue?.userName;
  }

  /** Returns true if the current user is SystemAdmin or Admin (Role check only) */
  isAdminOrAbove(): boolean {
    const roles = this.getRoles();
    return roles.includes('SystemAdmin') || roles.includes('Admin');
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
