import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="h-screen w-screen flex flex-col font-sans bg-slate-50 overflow-hidden">
      <!-- Top Banner -->
      <header class="h-20 bg-teal-700 shadow-md flex items-center justify-between px-6 z-20">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <i class="pi pi-th-large text-2xl text-teal-700"></i>
          </div>
          <h1 class="text-xl md:text-2xl font-bold text-white tracking-wide">Pharmacy System</h1>
        </div>
        <div class="flex items-center gap-3 bg-teal-800 px-4 py-2 rounded-full border border-teal-600 shadow-inner" *ngIf="user">
          <i class="pi pi-user text-teal-100"></i>
          <span class="text-white font-medium text-sm w-max">{{ user.fullName }} <span class="text-teal-300 ml-1">({{ user.roles[0] }})</span></span>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-64 bg-slate-800 shadow-xl flex flex-col z-10 transition-all">
          <div class="p-6 border-b border-slate-700">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Navigation</h3>
          </div>
          <nav class="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
            <div class="nav-item" routerLink="/dashboard" routerLinkActive="active-nav-item" [routerLinkActiveOptions]="{exact: true}">
              <i class="pi pi-home text-lg"></i> <span class="text-[15px]">Home</span>
            </div>
            <div class="nav-item" *ngIf="isPharmacist() || isAdmin()" routerLink="/dashboard/medicines" routerLinkActive="active-nav-item">
              <i class="pi pi-box text-lg"></i> <span class="text-[15px]">Medicines Filter</span>
            </div>
            <div class="nav-item" *ngIf="isManager() || isAdmin()" routerLink="/dashboard/purchases" routerLinkActive="active-nav-item">
              <i class="pi pi-shopping-bag text-lg"></i> <span class="text-[15px]">Procurement</span>
            </div>
            <div class="nav-item" *ngIf="isCashier() || isAdmin()" routerLink="/dashboard/sales" routerLinkActive="active-nav-item">
              <i class="pi pi-receipt text-lg"></i> <span class="text-[15px]">Sales POS</span>
            </div>
          </nav>
          <div class="p-5 border-t border-slate-700">
            <button (click)="onLogout()" class="w-full flex items-center justify-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] text-white py-3 rounded-lg font-medium transition-colors shadow-sm">
              <i class="pi pi-sign-out"></i> Logout
            </button>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 bg-slate-50 p-6 md:p-8 overflow-y-auto relative isolate">
          <router-outlet *ngIf="!isRoot()"></router-outlet>
          
          <div class="h-full flex flex-col animate-fadein" *ngIf="isRoot()">
            <h2 class="text-3xl font-bold text-slate-800 mb-8 border-b border-slate-200 pb-4">Welcome to your Dashboard</h2>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              
              <!-- Dashboard Home -->
              <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-lg hover:border-teal-300 transition-all hover:-translate-y-1 group" (click)="navigate('/dashboard')">
                <div class="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-3xl group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                  <i class="pi pi-home"></i>
                </div>
                <span class="text-xl font-bold text-slate-700 group-hover:text-teal-700 transition-colors">Overview</span>
              </div>

              <!-- Pharmacist -->
              <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-lg hover:border-sky-300 transition-all hover:-translate-y-1 group" *ngIf="isPharmacist() || isAdmin()" (click)="navigate('/dashboard/medicines')">
                <div class="w-20 h-20 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center text-3xl group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
                  <i class="pi pi-box"></i>
                </div>
                <span class="text-xl font-bold text-slate-700 group-hover:text-sky-700 transition-colors">Medicines</span>
              </div>

              <!-- Manager -->
              <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all hover:-translate-y-1 group" *ngIf="isManager() || isAdmin()" (click)="navigate('/dashboard/purchases')">
                <div class="w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <i class="pi pi-shopping-bag"></i>
                </div>
                <span class="text-xl font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Purchases</span>
              </div>

              <!-- Cashier -->
              <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-lg hover:border-emerald-300 transition-all hover:-translate-y-1 group" *ngIf="isCashier() || isAdmin()" (click)="navigate('/dashboard/sales')">
                <div class="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  <i class="pi pi-receipt"></i>
                </div>
                <span class="text-xl font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">Sales POS</span>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .nav-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      color: #94a3b8; /* slate-400 */
      font-weight: 500;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }
    .nav-item:hover {
      background-color: #334155; /* slate-700 */
      color: #f8fafc; /* slate-50 */
    }
    .active-nav-item {
      background-color: #0d9488 !important; /* teal-600 */
      color: #ffffff !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .active-nav-item i {
      color: #ccfbf1; /* teal-100 */
    }
    @keyframes fadein {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadein {
      animation: fadein 0.4s ease-out forwards;
    }
  `]
})
export class DashboardComponent implements OnInit {
  user: any;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.user = this.authService.currentUserValue;
  }

  isRoot() {
    return this.router.url === '/dashboard';
  }

  isAdmin() { return this.authService.getRoles().includes('Admin'); }
  isPharmacist() { return this.authService.getRoles().includes('Pharmacist'); }
  isManager() { return this.authService.getRoles().includes('Manager'); }
  isCashier() { return this.authService.getRoles().includes('Cashier'); }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
