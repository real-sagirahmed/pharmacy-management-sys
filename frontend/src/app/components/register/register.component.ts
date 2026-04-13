import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
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
            <h2>Join Our Platform Today.</h2>
            <p>Empower your pharmacy business with intelligent tracking and seamless management.</p>
          </div>
          <div class="stats-float">
            <div class="stat-item">
              <i class="pi pi-users"></i> Multi-user Roles
            </div>
            <div class="stat-item">
              <i class="pi pi-chart-line"></i> Analytics Ready
            </div>
          </div>
        </div>
        <div class="visual-bg"></div>
      </div>

      <!-- Right Side: Form -->
      <div class="login-form-side">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">Create Account</h2>
            <p class="form-sub">Start your 14-day free trial today.</p>
          </div>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
            <!-- Full Name -->
            <div class="form-field">
              <label class="field-label">Full Name</label>
              <div class="field-input-wrap">
                <i class="pi pi-id-card field-icon"></i>
                <input type="text" formControlName="fullName" 
                       placeholder="e.g. John Doe" class="field-input">
              </div>
              <div *ngIf="registerForm.get('fullName')?.touched && registerForm.get('fullName')?.errors?.['required']" class="field-error animate-fadein">
                Full name is required.
              </div>
            </div>

            <!-- Email -->
            <div class="form-field">
              <label class="field-label">Email Address</label>
              <div class="field-input-wrap">
                <i class="pi pi-envelope field-icon"></i>
                <input type="email" formControlName="email" 
                       placeholder="john@example.com" class="field-input">
              </div>
              <div *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.errors" class="field-error animate-fadein">
                <span *ngIf="registerForm.get('email')?.errors?.['required']">Email is required.</span>
                <span *ngIf="registerForm.get('email')?.errors?.['email']">Invalid email format.</span>
              </div>
            </div>

            <!-- Username -->
            <div class="form-field">
              <label class="field-label">Username</label>
              <div class="field-input-wrap">
                <i class="pi pi-user field-icon"></i>
                <input type="text" formControlName="username" 
                       placeholder="johndoe" class="field-input">
              </div>
              <div *ngIf="registerForm.get('username')?.touched && registerForm.get('username')?.errors" class="field-error animate-fadein">
                <span *ngIf="registerForm.get('username')?.errors?.['required']">Username is required.</span>
                <span *ngIf="registerForm.get('username')?.errors?.['minlength']">Minimum 3 characters.</span>
              </div>
            </div>

            <div class="form-grid-2">
              <!-- Password -->
              <div class="form-field">
                <label class="field-label">Password</label>
                <div class="field-input-wrap">
                  <i class="pi pi-lock field-icon"></i>
                  <input type="password" formControlName="password" 
                         placeholder="••••••••" class="field-input">
                </div>
                <div *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.errors" class="field-error animate-fadein">
                  <span *ngIf="registerForm.get('password')?.errors?.['required']">Password is required.</span>
                  <span *ngIf="registerForm.get('password')?.errors?.['minlength']">Minimum 6 characters required.</span>
                </div>
              </div>

              <!-- Confirm Password -->
              <div class="form-field">
                <label class="field-label">Confirm Password</label>
                <div class="field-input-wrap">
                  <i class="pi pi-shield field-icon"></i>
                  <input type="password" formControlName="confirmPassword" 
                         placeholder="••••••••" class="field-input">
                </div>
                <div *ngIf="registerForm.get('confirmPassword')?.touched && registerForm.get('confirmPassword')?.errors" class="field-error animate-fadein">
                  <span *ngIf="registerForm.get('confirmPassword')?.errors?.['required']">Please confirm your password.</span>
                  <span *ngIf="registerForm.get('confirmPassword')?.errors?.['mismatch']">Passwords do not match.</span>
                </div>
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
            <button type="submit" [disabled]="loading" class="submit-btn" style="background:#0d9488">
              <span *ngIf="!loading">Create Account <i class="pi pi-user-plus ml-2"></i></span>
              <span *ngIf="loading"><i class="pi pi-spin pi-spinner"></i> Registering…</span>
            </button>

            <div class="auth-footer">
              Already have an account? <a routerLink="/login">Log In</a>
            </div>
          </form>

          <p class="copyright text-center py-4">© 2024 Pharmacy Management System</p>
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
      background: linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%);
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
      display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #a5b4fc;
    }
    .brand-name { font-size: 2.2rem; font-weight: 800; color: #fff; margin:0; }

    .visual-text h2 { font-size: 2.8rem; font-weight: 900; line-height: 1.1; margin: 0 0 16px; }
    .visual-text p  { font-size: 1.1rem; color: #a5b4fc; line-height: 1.6; margin:0; }

    .stats-float { display: flex; gap: 16px; }
    .stat-item {
      display: flex; align-items: center; gap: 8px; font-size: .875rem; font-weight: 600;
      color: #fff; background: rgba(255, 255, 255, 0.1);
      padding: 8px 16px; border-radius: 99px; border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Right Side: Form */
    .login-form-side { flex: 1.1; min-width: 450px; background: #fff; display: flex; align-items: center; justify-content: center; padding: 40px; }
    .form-container { width: 100%; max-width: 440px; }

    .form-header { margin-bottom: 24px; }
    .form-title { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .form-sub   { font-size: 0.9rem; color: #64748b; margin: 0; }

    .auth-form { display: flex; flex-direction: column; gap: 16px; }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: .8rem; font-weight: 600; color: #475569; }

    .field-input-wrap { position: relative; }
    .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: .9rem; }
    .field-input {
      width: 100%; padding: 11px 14px 11px 40px;
      background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px;
      font-size: .9rem; font-family: 'Inter', sans-serif;
      transition: all .2s; outline: none; color: #0f172a;
    }
    .field-input:focus { border-color: #4f46e5; background: #fff; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }

    .error-pill, .success-pill {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; font-size: .85rem; font-weight: 600;
    }
    .error-pill { background: #fef2f2; color: #991b1b; border-left: 4px solid #ef4444; }
    .success-pill { background: #f0fdf4; color: #166534; border-left: 4px solid #22c55e; }

    .field-error { font-size: 0.75rem; color: #ef4444; font-weight: 500; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
    .field-error::before { content: '●'; font-size: 8px; }

    .submit-btn {
      width: 100%; padding: 14px; margin-top: 8px;
      background: #4f46e5; color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer; transition: all .2s;
    }
    .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    .auth-footer { text-align: center; font-size: .875rem; color: #64748b; margin-top: 10px; }
    .auth-footer a { color: #4f46e5; font-weight: 700; text-decoration: none; margin-left: 4px; }
    .auth-footer a:hover { text-decoration: underline; }

    .copyright { font-size: .75rem; color: #94a3b8; margin: 30px 0 0; }

    @media (max-width: 900px) {
      .login-visual { display: none; }
      .login-form-side { min-width: 100%; padding: 20px; }
      .form-grid-2 { grid-template-columns: 1fr; }
    }
    
    .animate-fadein { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.error = 'Please correct the errors in the form.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    
    // Default role Cashier as per original logic
    const payload = { ...this.registerForm.value, role: 'Cashier' };

    this.authService.register(payload).subscribe({
      next: () => {
        this.success = 'Account created successfully! Redirecting...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error = err.error || 'Registration failed';
        this.loading = false;
      }
    });
  }
}
