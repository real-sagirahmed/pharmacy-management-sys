import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (this.authService.isLoggedIn()) {
      // Check if route is restricted by role
      const expectedRoles = route.data['roles'] as Array<string>;
      if (expectedRoles) {
        const userRoles = this.authService.getRoles();
        const hasRole = expectedRoles.some(role => userRoles.includes(role));
        if (!hasRole) {
          this.router.navigate(['/dashboard']);
          return false;
        }
      }
      return true;
    }

    // Not logged in so redirect to login page with the return url
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
