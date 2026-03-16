import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
            <h2>Recover Your Account.</h2>
            <p>Don't worry, it happens to the best of us. Let's get you back in.</p>
          </div>
        </div>
        <div class="visual-bg"></div>
      </div>

      <!-- Right Side: Form -->
      <div class="login-form-side">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">Forgot Password?</h2>
            <p class="form-sub">Enter your email and we'll send a reset link.</p>
          </div>

          <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="auth-form">
            <!-- Email -->
            <div class="form-field">
              <label class="field-label">Email Address</label>
              <div class="field-input-wrap">
                <i class="pi pi-envelope field-icon"></i>
                <input type="email" formControlName="email" 
                       placeholder="Enter your registered email" class="field-input">
              </div>
            </div>

            <!-- Messages -->
            <div *ngIf="error" class="error-pill animate-fadein">
               <i class="pi pi-exclamation-circle"></i>
               <span>{{ error }}</span>
            </div>
            <div *ngIf="success" class="success-pill animate-fadein">
               <i class="pi pi-info-circle"></i>
               <span class="break-all">{{ success }}</span>
            </div>

            <!-- Submit -->
            <button type="submit" [disabled]="loading" class="submit-btn" style="background:#f59e0b">
              <span *ngIf="!loading">Send Reset Link <i class="pi pi-send ml-2"></i></span>
              <span *ngIf="loading"><i class="pi pi-spin pi-spinner"></i> Sending…</span>
            </button>

            <div class="auth-footer">
              Remember your password? <a routerLink="/login">Log In</a>
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
      background: linear-gradient(135deg, #f59e0b 0%, #7c2d12 100%);
      opacity: 0.9; z-index: 1;
    }
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
      display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #fde68a;
    }
    .brand-name { font-size: 2.2rem; font-weight: 800; color: #fff; margin:0; }

    .visual-text h2 { font-size: 2.8rem; font-weight: 900; line-height: 1.1; margin: 0 0 16px; }
    .visual-text p  { font-size: 1.1rem; color: #fde68a; line-height: 1.6; margin:0; }

    /* Right Side: Form */
    .login-form-side { flex: 1; min-width: 450px; background: #fff; display: flex; align-items: center; justify-content: center; padding: 40px; }
    .form-container { width: 100%; max-width: 400px; }

    .form-header { margin-bottom: 32px; }
    .form-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .form-sub   { font-size: 0.95rem; color: #64748b; margin: 0; }

    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .form-field { display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: .875rem; font-weight: 600; color: #334155; }

    .field-input-wrap { position: relative; }
    .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1rem; }
    .field-input {
      width: 100%; padding: 12px 14px 12px 42px;
      background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;
      font-size: .95rem; font-family: 'Inter', sans-serif;
      transition: all .2s; outline: none; color: #0f172a;
    }
    .field-input:focus { border-color: #f59e0b; background: #fff; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1); }

    .error-pill, .success-pill {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; font-size: .875rem; font-weight: 600;
    }
    .error-pill { background: #fef2f2; color: #991b1b; border-left: 4px solid #ef4444; }
    .success-pill { background: #fffbeb; color: #92400e; border-left: 4px solid #f59e0b; }

    .submit-btn {
      width: 100%; padding: 14px; margin-top: 10px;
      background: #f59e0b; color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer; transition: all .2s;
    }
    .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    .auth-footer { text-align: center; font-size: .9rem; color: #64748b; margin-top: 12px; }
    .auth-footer a { color: #f59e0b; font-weight: 700; text-decoration: none; margin-left: 4px; }
    .auth-footer a:hover { text-decoration: underline; }

    .copyright { font-size: .75rem; color: #94a3b8; margin: 40px 0 0; }

    @media (max-width: 900px) {
      .login-visual { display: none; }
      .login-form-side { min-width: 100%; }
    }
    
    .animate-fadein { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  loading = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotForm.invalid) {
      this.error = 'Please enter a valid email address.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.authService.forgotPassword(this.forgotForm.value.email).subscribe({
      next: (res) => {
        this.success = res.message || 'If that email address is in our database, we will send you an email to reset your password.';
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to process your request at this time.';
        this.loading = false;
      }
    });
  }
}
