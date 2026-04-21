// auth.guard.ts
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    private hasAdminSession(): boolean {
        const adminToken = sessionStorage.getItem('admin_auth_token');
        const adminUserId = sessionStorage.getItem('admin_user_id');
        return Boolean(adminToken && adminUserId);
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        if (state.url.startsWith('/admin')) {
            if (this.hasAdminSession()) {
                return true;
            }

            this.router.navigate(['/admin-login']);
            return false;
        }

        // Allow user sessions and active admin sessions to access protected non-admin routes.
        if (this.authService.isLoggedIn() || this.hasAdminSession()) {
            return true;
        } else {
            this.router.navigate(['/login']);
            return false;
        }
    }
}