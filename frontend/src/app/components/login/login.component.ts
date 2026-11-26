import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { TenantConfigService } from '../../services/tenant-config.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  template: `
    <div class="login-wrapper animate-fadein">
      <!-- Left Side: Branding/Visual -->
      <div class="login-visual">
        <div class="visual-content">
          <div class="glass-brand">
            <div class="brand-icon">
              <img [src]="tenantConfig.logoUrl()" [alt]="tenantConfig.pharmacyName() + ' Logo'" style="width: 38px; height: 38px; object-fit: contain;">
            </div>
            <div>
              <h1 class="brand-name">{{ tenantConfig.pharmacyName() }}</h1>
              <p class="brand-sub-login" style="font-size: 0.95rem; color: #94a3b8; margin: 0;">{{ tenantConfig.tagline() }}</p>
            </div>
          </div>

          <div class="visual-text">
            <h2>Modern. Fast. Reliable.</h2>
            <p>The total solution for your pharmaceutical business management.</p>
          </div>
          <div class="stats-float">
            <div class="stat-item">
              <i class="pi pi-check-circle"></i> 100% Secure
            </div>
            <div class="stat-item">
              <i class="pi pi-bolt"></i> Real-time Sync
            </div>
          </div>
        </div>
        <div class="visual-bg"></div>
      </div>

      <!-- Right Side: Form -->
      <div class="login-form-side">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">Welcome Back</h2>
            <p class="form-sub">Please enter your details to sign in.</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="auth-form">
            <!-- Username -->
            <div class="form-field">
              <label class="field-label">Username</label>
              <div class="field-input-wrap">
                <i class="pi pi-user field-icon"></i>
                <input type="text" formControlName="username" 
                       placeholder="Enter your username" class="field-input">
              </div>
              <div *ngIf="loginForm.get('username')?.touched && loginForm.get('username')?.errors?.['required']" class="field-error animate-fadein">
                Username is required.
              </div>
            </div>

            <!-- Password -->
            <div class="form-field">
              <div class="field-label-row">
                <label class="field-label">Password</label>
                <a routerLink="/forgot-password" class="field-link">Forgot?</a>
              </div>
              <div class="field-input-wrap">
                <i class="pi pi-lock field-icon"></i>
                <input [type]="showPassword ? 'text' : 'password'" formControlName="password" 
                       placeholder="••••••••" class="field-input">
                <button type="button" class="password-toggle" (click)="showPassword = !showPassword" [title]="showPassword ? 'Hide Password' : 'Show Password'">
                  <i class="pi" [class.pi-eye]="!showPassword" [class.pi-eye-slash]="showPassword"></i>
                </button>
              </div>
              <div *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.errors?.['required']" class="field-error animate-fadein">
                Password is required.
              </div>
            </div>


            <!-- Error Message -->
            <div *ngIf="error" class="error-pill animate-fadein">
               <i class="pi pi-exclamation-circle"></i>
               <span>{{ error }}</span>
            </div>

            <!-- Submit -->
            <button type="submit" [disabled]="loading" class="submit-btn">
              <span *ngIf="!loading">Sign In <i class="pi pi-arrow-right ml-2"></i></span>
              <span *ngIf="loading"><i class="pi pi-spin pi-spinner"></i> Signing in…</span>
            </button>

            <div class="auth-footer">
              Need an account? Contact your pharmacy administrator.
            </div>
          </form>

          <p class="copyright text-center py-8">© {{ currentYear }} {{ tenantConfig.pharmacyName() }}</p>
        </div>
      </div>
    </div>

  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100vw; overflow: hidden; }

    .login-wrapper { display: flex; height: 100%; width: 100%; font-family: 'Inter', sans-serif; }

    /* Left Side: Visual */
    .login-visual {
      flex: 1.2; position: relative; display: flex; align-items: center; justify-content: center;
      background: #050505; color: #fff; overflow: hidden;
    }
    .visual-bg {
      position: absolute; top:0; left:0; width:100%; height:100%;
      background: linear-gradient(135deg, var(--brand) 0%, #050505 100%);
      opacity: 0.95; z-index: 1;
    }
    /* Add a pattern */
    .visual-bg::after {
      content: ''; position: absolute; top:0; left:0; width:100%; height:100%;
      background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
      opacity: 0.08;
    }

    .visual-content { position: relative; z-index: 2; width: 80%; max-width: 500px; display: flex; flex-direction: column; gap: 40px; }
    
    .glass-brand { display: flex; align-items: center; gap: 16px; }
    .brand-icon {
      width: 56px; height: 56px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2); border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px var(--brand-glow);
    }
    .brand-name { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; color: #fff; margin:0; }

    .visual-text h2 { font-size: 2.8rem; font-weight: 900; line-height: 1.1; margin: 0 0 16px; color: #fff; }
    .visual-text p  { font-size: 1.1rem; color: #94a3b8; line-height: 1.6; margin:0; }

    .stats-float { display: flex; gap: 16px; }
    .stat-item {
      display: flex; align-items: center; gap: 8px; font-size: .875rem; font-weight: 700;
      color: #FFFFFF; background: var(--brand-badge-bg, rgba(0, 112, 112, 0.35));
      padding: 8px 18px; border-radius: 99px; border: 1px solid var(--brand-badge-border, rgba(0, 112, 112, 0.5));
      box-shadow: 0 4px 12px var(--brand-glow);
    }

    /* Right Side: Form */
    .login-form-side { flex: 1; min-width: 450px; background: var(--s7-card); display: flex; align-items: center; justify-content: center; padding: 40px; }
    .form-container { width: 100%; max-width: 400px; }

    .form-header { margin-bottom: 32px; }
    .form-title { font-size: 2rem; font-weight: 800; color: var(--s7-heading); margin: 0 0 8px; }
    .form-sub   { font-size: 0.95rem; color: var(--s7-muted); font-weight: 500; margin: 0; }

    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .form-field { display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: .875rem; font-weight: 700; color: var(--s7-heading); }
    .field-label-row { display: flex; justify-content: space-between; align-items: center; }
    .field-link { font-size: .8rem; font-weight: 700; color: var(--brand); text-decoration: none; }
    .field-link:hover { color: var(--brand-hover); }

    .field-input-wrap { position: relative; display: flex; align-items: center; }
    .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--s7-muted); font-size: 1rem; }
    .field-input {
      width: 100%; padding: 12px 14px 12px 42px;
      background: var(--s7-section); border: 1.5px solid var(--s7-border); border-radius: 12px;
      font-size: .95rem; font-family: 'Inter', sans-serif;
      transition: all .2s; outline: none; color: var(--s7-heading);
    }
    .field-input:focus { border-color: var(--brand); background: var(--s7-card); box-shadow: 0 0 0 4px var(--brand-glow); }
    
    .password-toggle {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: var(--s7-muted); cursor: pointer;
      padding: 6px; display: flex; align-items: center; justify-content: center;
      transition: color 0.2s;
    }
    .password-toggle:hover { color: var(--brand); }
    .password-toggle i { font-size: 1.1rem; }


    .error-pill {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px;
      background: var(--s7-danger-bg); color: var(--s7-danger); border-left: 4px solid var(--s7-danger); font-size: .875rem; font-weight: 600;
    }

    .field-error { font-size: 0.75rem; color: var(--s7-danger); font-weight: 500; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
    .field-error::before { content: '●'; font-size: 8px; }

    .submit-btn {
      width: 100%; padding: 14px; margin-top: 10px;
      background: var(--brand); color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer; transition: all .2s;
      box-shadow: 0 4px 14px var(--brand-glow);
    }
    .submit-btn:hover:not(:disabled) { background: var(--brand-hover); transform: translateY(-1px); box-shadow: 0 8px 20px var(--brand-glow); }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    .auth-footer { text-align: center; font-size: .9rem; color: var(--s7-muted); font-weight: 500; margin-top: 12px; }
    .auth-footer a { color: var(--brand); font-weight: 700; text-decoration: none; margin-left: 4px; }
    .auth-footer a:hover { color: var(--brand-hover); text-decoration: underline; }

    .copyright { font-size: .75rem; color: var(--s7-muted); margin: 40px 0 0; }

    @media (max-width: 900px) {
      .login-visual { display: none; }
      .login-form-side { min-width: 100%; }
    }
    
    .animate-fadein { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;
  currentYear = new Date().getFullYear();


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public tenantConfig: TenantConfigService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err?.error?.message || (err?.status === 403 ? 'Access denied. Please contact your administrator.' : 'Invalid credentials. Please try again.');
        this.loading = false;
      }
    });
  }
}
