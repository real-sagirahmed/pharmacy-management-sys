import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
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
              <i class="pi pi-th-large"></i>
            </div>
            <h1 class="brand-name">Pharmacy System</h1>
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
            </div>

            <!-- Password -->
            <div class="form-field">
              <div class="field-label-row">
                <label class="field-label">Password</label>
                <a routerLink="/forgot-password" class="field-link">Forgot?</a>
              </div>
              <div class="field-input-wrap">
                <i class="pi pi-lock field-icon"></i>
                <input type="password" formControlName="password" 
                       placeholder="••••••••" class="field-input">
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

            <!-- Forgot Password is handled in labels, but keeping common check -->
            <div class="auth-footer">
              Don't have an account? <a routerLink="/register">Create Account</a>
            </div>
          </form>

          <p class="copyright text-center py-8">© 2024 Pharmacy Management System</p>
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
      background: #0f172a; color: #fff; overflow: hidden;
    }
    .visual-bg {
      position: absolute; top:0; left:0; width:100%; height:100%;
      background: linear-gradient(135deg, #0d9488 0%, #1e1b4b 100%);
      opacity: 0.9; z-index: 1;
    }
    /* Add a pattern */
    .visual-bg::after {
      content: ''; position: absolute; top:0; left:0; width:100%; height:100%;
      background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
      opacity: 0.1;
    }

    .visual-content { position: relative; z-index: 2; width: 80%; max-width: 500px; display: flex; flex-direction: column; gap: 40px; }
    
    .glass-brand { display: flex; align-items: center; gap: 16px; }
    .brand-icon {
      width: 56px; height: 56px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2); border-radius: 16px;
      display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #5eead4;
    }
    .brand-name { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; color: #fff; margin:0; }

    .visual-text h2 { font-size: 2.8rem; font-weight: 900; line-height: 1.1; margin: 0 0 16px; color: #fff; }
    .visual-text p  { font-size: 1.1rem; color: #94a3b8; line-height: 1.6; margin:0; }

    .stats-float { display: flex; gap: 16px; }
    .stat-item {
      display: flex; align-items: center; gap: 8px; font-size: .875rem; font-weight: 600;
      color: #5eead4; background: rgba(13, 148, 136, 0.2);
      padding: 8px 16px; border-radius: 99px; border: 1px solid rgba(13, 148, 136, 0.3);
    }

    /* Right Side: Form */
    .login-form-side { flex: 1; min-width: 450px; background: #fff; display: flex; align-items: center; justify-content: center; padding: 40px; }
    .form-container { width: 100%; max-width: 400px; }

    .form-header { margin-bottom: 32px; }
    .form-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .form-sub   { font-size: 0.95rem; color: #64748b; margin: 0; }

    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .form-field { display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: .875rem; font-weight: 600; color: #334155; }
    .field-label-row { display: flex; justify-content: space-between; align-items: center; }
    .field-link { font-size: .8rem; font-weight: 700; color: #0d9488; text-decoration: none; }
    .field-link:hover { color: #0f766e; }

    .field-input-wrap { position: relative; display: flex; align-items: center; }
    .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1rem; }
    .field-input {
      width: 100%; padding: 12px 14px 12px 42px;
      background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;
      font-size: .95rem; font-family: 'Inter', sans-serif;
      transition: all .2s; outline: none; color: #0f172a;
    }
    .field-input:focus { border-color: #0d9488; background: #fff; box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1); }

    .error-pill {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px;
      background: #fef2f2; color: #991b1b; border-left: 4px solid #ef4444; font-size: .875rem; font-weight: 600;
    }

    .submit-btn {
      width: 100%; padding: 14px; margin-top: 10px;
      background: #0f172a; color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer; transition: all .2s;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,.1);
    }
    .submit-btn:hover:not(:disabled) { background: #1e293b; transform: translateY(-1px); box-shadow: 0 10px 15px -3px rgba(0,0,0,.1); }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    .auth-footer { text-align: center; font-size: .9rem; color: #64748b; margin-top: 12px; }
    .auth-footer a { color: #0d9488; font-weight: 700; text-decoration: none; margin-left: 4px; }
    .auth-footer a:hover { color: #0f766e; text-decoration: underline; }

    .copyright { font-size: .75rem; color: #94a3b8; margin: 40px 0 0; }

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onLogin() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = '';
    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => { this.error = 'Invalid credentials. Please try again.'; this.loading = false; }
    });
  }
}
