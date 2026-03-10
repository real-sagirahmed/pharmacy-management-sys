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
    <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
      <!-- Top Banner -->
      <header class="w-full bg-teal-700 shadow-md py-4 px-6 flex items-center justify-between z-10">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <i class="pi pi-th-large text-2xl text-teal-700"></i>
          </div>
          <h1 class="text-2xl md:text-3xl font-bold text-white tracking-wide">Pharmacy System</h1>
        </div>
      </header>

      <!-- Main Login Section -->
      <main class="flex-1 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div class="bg-slate-800 p-8 flex flex-col items-center justify-center relative">
            <div class="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center shadow-lg mb-4 border-4 border-slate-800 absolute -top-10">
              <i class="pi pi-user text-4xl text-white"></i>
            </div>
            <h2 class="text-3xl font-bold text-white mt-8 tracking-tight">Welcome Back</h2>
            <p class="text-slate-300 text-sm mt-2 font-medium">Sign in to your account</p>
          </div>
          
          <div class="p-8">
            <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="flex flex-col gap-6">
              
              <!-- Username -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                <div class="relative">
                  <i class="pi pi-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                  <input type="text" formControlName="username" placeholder="Enter your username" class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-sm">
                </div>
              </div>
              
              <!-- Password -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div class="relative">
                  <i class="pi pi-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                  <input type="password" formControlName="password" placeholder="Enter your password" class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-sm">
                </div>
                <div class="text-right mt-3">
                  <a routerLink="/forgot-password" class="text-sm font-bold text-teal-600 hover:text-teal-800 transition-colors">Forgot Password?</a>
                </div>
              </div>
              
              <!-- Error Box -->
              <div *ngIf="error" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start animate-fadein">
                <i class="pi pi-exclamation-circle text-red-500 mt-0.5 mr-3 text-lg"></i>
                <p class="text-sm text-red-700 font-medium">{{error}}</p>
              </div>

              <!-- Submit -->
              <button type="submit" [disabled]="loading" class="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-4 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg">
                <i class="pi pi-sign-in" *ngIf="!loading"></i>
                <i class="pi pi-spinner pi-spin" *ngIf="loading"></i>
                {{ loading ? 'Signing in...' : 'Sign In' }}
              </button>
              
              <div class="mt-4 pt-6 border-t border-slate-100 text-center text-slate-600 text-sm font-medium">
                Don't have an account? <a routerLink="/register" class="font-bold text-teal-600 hover:text-teal-800 transition-colors ml-1">Create Account</a>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: []
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
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = 'Invalid credentials';
        this.loading = false;
      }
    });
  }
}
