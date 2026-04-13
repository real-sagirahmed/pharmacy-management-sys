import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
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
            <h2>Secure Your Account.</h2>
            <p>Choose a strong password to keep your data safe and protected.</p>
          </div>
        </div>
        <div class="visual-bg"></div>
      </div>

      <!-- Right Side: Form -->
      <div class="login-form-side">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">Reset Password</h2>
            <p class="form-sub">Create a new, secure password for your account.</p>
          </div>

          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form">
            <!-- Email -->
            <div class="form-field">
              <label class="field-label">Email Address</label>
              <div class="field-input-wrap">
                <i class="pi pi-envelope field-icon"></i>
                <input type="email" formControlName="email" 
                       placeholder="Enter your email" class="field-input" [readonly]="hasEmailParam">
              </div>
              <div *ngIf="resetForm.get('email')?.touched && resetForm.get('email')?.errors" class="field-error animate-fadein">
                <span *ngIf="resetForm.get('email')?.errors?.['required']">Email is required.</span>
                <span *ngIf="resetForm.get('email')?.errors?.['email']">Invalid email format.</span>
              </div>
            </div>

            <!-- Token -->
            <div class="form-field">
              <label class="field-label">Reset Token</label>
              <div class="field-input-wrap">
                <i class="pi pi-key field-icon"></i>
                <input type="text" formControlName="token" 
                       placeholder="Paste your reset token" class="field-input" [readonly]="hasTokenParam">
              </div>
              <div *ngIf="resetForm.get('token')?.touched && resetForm.get('token')?.errors?.['required']" class="field-error animate-fadein">
                Reset token is required.
              </div>
            </div>

            <!-- New Password -->
            <div class="form-field">
              <label class="field-label">New Password</label>
              <div class="field-input-wrap">
                <i class="pi pi-lock field-icon"></i>
                <input type="password" formControlName="newPassword" 
                       placeholder="Enter new password" class="field-input">
              </div>
              <div *ngIf="resetForm.get('newPassword')?.touched && resetForm.get('newPassword')?.errors" class="field-error animate-fadein">
                <span *ngIf="resetForm.get('newPassword')?.errors?.['required']">New password is required.</span>
                <span *ngIf="resetForm.get('newPassword')?.errors?.['minlength']">Minimum 6 characters required.</span>
              </div>
            </div>

            <!-- Confirm New Password -->
            <div class="form-field">
              <label class="field-label">Confirm New Password</label>
              <div class="field-input-wrap">
                <i class="pi pi-shield field-icon"></i>
                <input type="password" formControlName="confirmNewPassword" 
                       placeholder="Confirm new password" class="field-input">
              </div>
              <div *ngIf="resetForm.get('confirmNewPassword')?.touched && resetForm.get('confirmNewPassword')?.errors" class="field-error animate-fadein">
                <span *ngIf="resetForm.get('confirmNewPassword')?.errors?.['required']">Please confirm your new password.</span>
                <span *ngIf="resetForm.get('confirmNewPassword')?.errors?.['mismatch']">Passwords do not match.</span>
              </div>
            </div>

            <!-- Messages -->
            <div *ngIf="error" class="error-pill animate-fadein">
               <i class="pi pi-exclamation-circle"></i>
               <span>{{ error }}</span>
            </div>
            <div *ngIf="success" class="success-pill animate-fadein">
               <i class="pi pi-check-circle"></i>
               <span>{{ success }}</span>
            </div>

            <!-- Submit -->
            <button type="submit" [disabled]="loading" class="submit-btn">
              <span *ngIf="!loading">Reset Password <i class="pi pi-save ml-2"></i></span>
              <span *ngIf="loading"><i class="pi pi-spin pi-spinner"></i> Resetting…</span>
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
      background: linear-gradient(135deg, #0d9488 0%, #1e1b4b 100%);
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
      display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #5eead4;
    }
    .brand-name { font-size: 2.2rem; font-weight: 800; color: #fff; margin:0; }

    .visual-text h2 { font-size: 2.8rem; font-weight: 900; line-height: 1.1; margin: 0 0 16px; }
    .visual-text p  { font-size: 1.1rem; color: #94a3b8; line-height: 1.6; margin:0; }

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
    .field-input:focus { border-color: #0d9488; background: #fff; box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1); }
    .field-input[readonly] { background: #f1f5f9; cursor: not-allowed; color: #64748b; }

    .error-pill, .success-pill {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; font-size: .875rem; font-weight: 600;
    }
    .error-pill { background: #fef2f2; color: #991b1b; border-left: 4px solid #ef4444; }
    .success-pill { background: #f0fdfa; color: #0f766e; border-left: 4px solid #0d9488; }

    .field-error { font-size: 0.75rem; color: #ef4444; font-weight: 500; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
    .field-error::before { content: '●'; font-size: 8px; }

    .submit-btn {
      width: 100%; padding: 14px; margin-top: 10px;
      background: #0d9488; color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer; transition: all .2s;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,.1);
    }
    .submit-btn:hover:not(:disabled) { background: #0f766e; transform: translateY(-1px); }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    .auth-footer { text-align: center; font-size: .9rem; color: #64748b; margin-top: 12px; }
    .auth-footer a { color: #0d9488; font-weight: 700; text-decoration: none; margin-left: 4px; }
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
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  hasTokenParam = false;
  hasEmailParam = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      token: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmNewPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.resetForm.patchValue({ token: params['token'] });
        this.hasTokenParam = true;
      }
      if (params['email']) {
        this.resetForm.patchValue({ email: params['email'] });
        this.hasEmailParam = true;
      }
    });
  }

  onSubmit() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      this.error = 'Please correct the errors in the form.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.resetPassword(this.resetForm.value).subscribe({
      next: (res) => {
        this.success = 'Password reset successfully! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error = err.error || 'Failed to reset password. Please verify the token is valid.';
        this.loading = false;
      }
    });
  }
}
