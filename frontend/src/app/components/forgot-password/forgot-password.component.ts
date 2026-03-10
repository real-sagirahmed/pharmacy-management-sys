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
    <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header class="w-full bg-teal-700 shadow-md py-4 px-6 flex items-center justify-between z-10">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <i class="pi pi-th-large text-2xl text-teal-700"></i>
          </div>
          <h1 class="text-2xl md:text-3xl font-bold text-white tracking-wide">Pharmacy System</h1>
        </div>
      </header>

      <main class="flex-1 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div class="bg-slate-800 p-8 flex flex-col items-center justify-center relative">
            <div class="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center shadow-lg mb-4 border-4 border-slate-800 absolute -top-10">
              <i class="pi pi-key text-4xl text-white"></i>
            </div>
            <h2 class="text-3xl font-bold text-white mt-8 tracking-tight">Forgot Password</h2>
            <p class="text-slate-300 text-sm mt-2 font-medium text-center px-4">Enter your email and we'll send you a link to reset your password.</p>
          </div>

          <div class="p-8">
            <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
              
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div class="relative">
                  <i class="pi pi-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                  <input type="email" formControlName="email" placeholder="Enter your email" class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-sm">
                </div>
              </div>
              
              <div *ngIf="error" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start animate-fadein">
                <i class="pi pi-exclamation-circle text-red-500 mt-0.5 mr-3 text-lg"></i>
                <p class="text-sm text-red-700 font-medium">{{error}}</p>
              </div>
              <div *ngIf="success" class="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-md flex items-start animate-fadein break-all">
                <i class="pi pi-check-circle text-teal-600 mt-0.5 mr-3 text-lg"></i>
                <p class="text-sm text-teal-800 font-medium">{{success}}</p>
              </div>

              <button type="submit" [disabled]="loading" class="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-4 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg">
                <i class="pi pi-send" *ngIf="!loading"></i>
                <i class="pi pi-spinner pi-spin" *ngIf="loading"></i>
                {{ loading ? 'Sending...' : 'Send Reset Link' }}
              </button>
              
              <div class="mt-4 pt-6 border-t border-slate-100 text-center text-slate-600 text-sm font-medium">
                Remember your password? <a routerLink="/login" class="font-bold text-teal-600 hover:text-teal-800 transition-colors ml-1">Log In</a>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  loading = false;
  error = '';
  success = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {
    this.forgotForm = this.formBuilder.group({
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
        // Development feedback: display token directly
        this.success = `Link sent! For testing, your token is: ${res.token}`;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Unable to process your request at this time.';
        this.loading = false;
      }
    });
  }
}
