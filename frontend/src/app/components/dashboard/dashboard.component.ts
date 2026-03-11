import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MedicineService } from '../../services/medicine.service';
import { SalesService } from '../../services/sales.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-shell">

      <!-- ═══ TOP HEADER ═══ -->
      <header class="app-header">
        <div class="header-left">
          <button class="sidebar-toggle" (click)="sidebarOpen.set(!sidebarOpen())">
            <i class="pi pi-bars"></i>
          </button>
          <div class="brand-icon">
            <i class="pi pi-heart-fill" style="color:#0d9488;font-size:1.4rem"></i>
          </div>
          <div class="brand-text">
            <span class="brand-name">s7 Drug House</span>
            <span class="brand-sub">Pharmacy System</span>
          </div>
        </div>

        <div class="header-right" *ngIf="user">
          <div class="header-time">
            <i class="pi pi-clock" style="font-size:.8rem;opacity:.6"></i>
            <span>{{ currentTime }}</span>
          </div>
          <div class="user-chip">
            <div class="user-avatar">{{ user.fullName?.charAt(0) || 'U' }}</div>
            <div class="user-info">
              <span class="user-name">{{ user.fullName }}</span>
              <span class="user-role">{{ user.roles?.[0] }}</span>
            </div>
          </div>
        </div>
      </header>

      <div class="app-body">

        <!-- ═══ SIDEBAR ═══ -->
        <aside class="app-sidebar" [class.sidebar-collapsed]="!sidebarOpen()">
          <nav class="sidebar-nav">
            <div class="nav-section-label">NAVIGATION</div>

            <a class="nav-item" routerLink="/dashboard"
               routerLinkActive="nav-active" [routerLinkActiveOptions]="{exact:true}">
              <i class="pi pi-home nav-icon"></i>
              <span class="nav-label">Dashboard</span>
            </a>

            <a class="nav-item" *ngIf="isPharmacist() || isAdmin()"
               routerLink="/dashboard/medicines" routerLinkActive="nav-active">
              <i class="pi pi-box nav-icon"></i>
              <span class="nav-label">Medicines</span>
            </a>

            <a class="nav-item" *ngIf="isManager() || isAdmin()"
               routerLink="/dashboard/purchases" routerLinkActive="nav-active">
              <i class="pi pi-shopping-bag nav-icon"></i>
              <span class="nav-label">Procurement</span>
            </a>

            <a class="nav-item" *ngIf="isCashier() || isAdmin()"
               routerLink="/dashboard/sales" routerLinkActive="nav-active">
              <i class="pi pi-receipt nav-icon"></i>
              <span class="nav-label">Sales POS</span>
            </a>

            <a class="nav-item" *ngIf="isAdmin()"
               routerLink="/dashboard/users" routerLinkActive="nav-active">
              <i class="pi pi-users nav-icon"></i>
              <span class="nav-label">Users</span>
            </a>
          </nav>

          <div class="sidebar-footer">
            <button class="logout-btn" (click)="onLogout()">
              <i class="pi pi-sign-out"></i>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <!-- ═══ MAIN CONTENT ═══ -->
        <main class="app-main">
          <router-outlet *ngIf="!isRoot()"></router-outlet>

          <!-- ── Dashboard Home ── -->
          <div class="dashboard-home animate-fadein-up" *ngIf="isRoot()">
            <div class="page-header">
              <div>
                <h1 class="page-title">Welcome back, {{ user?.fullName?.split(' ')?.[0] }} 👋</h1>
                <p class="page-sub">Here's what's happening in your pharmacy today.</p>
              </div>
            </div>

            <!-- KPI Cards -->
            <div class="kpi-grid">
              <div class="kpi-card kpi-teal" *ngIf="isPharmacist() || isAdmin()" (click)="navigate('/dashboard/medicines')">
                <div class="kpi-icon-wrap kpi-teal-icon">
                  <i class="pi pi-box"></i>
                </div>
                <div class="kpi-info">
                  <span class="kpi-label">Total Medicines</span>
                  <span class="kpi-value">{{ medicineCount }}</span>
                  <span class="kpi-meta">in inventory</span>
                </div>
                <i class="pi pi-arrow-right kpi-arrow"></i>
              </div>

              <div class="kpi-card kpi-amber" *ngIf="isPharmacist() || isAdmin()" (click)="navigate('/dashboard/medicines')">
                <div class="kpi-icon-wrap kpi-amber-icon">
                  <i class="pi pi-exclamation-triangle"></i>
                </div>
                <div class="kpi-info">
                  <span class="kpi-label">Low Stock</span>
                  <span class="kpi-value">{{ lowStockCount }}</span>
                  <span class="kpi-meta">items need restocking</span>
                </div>
                <i class="pi pi-arrow-right kpi-arrow"></i>
              </div>

              <div class="kpi-card kpi-emerald" *ngIf="isCashier() || isAdmin()" (click)="navigate('/dashboard/sales')">
                <div class="kpi-icon-wrap kpi-emerald-icon">
                  <i class="pi pi-receipt"></i>
                </div>
                <div class="kpi-info">
                  <span class="kpi-label">Sales POS</span>
                  <span class="kpi-value">Active</span>
                  <span class="kpi-meta">quick sale entry</span>
                </div>
                <i class="pi pi-arrow-right kpi-arrow"></i>
              </div>

              <div class="kpi-card kpi-indigo" *ngIf="isManager() || isAdmin()" (click)="navigate('/dashboard/purchases')">
                <div class="kpi-icon-wrap kpi-indigo-icon">
                  <i class="pi pi-shopping-bag"></i>
                </div>
                <div class="kpi-info">
                  <span class="kpi-label">Procurement</span>
                  <span class="kpi-value">New Order</span>
                  <span class="kpi-meta">purchase from supplier</span>
                </div>
                <i class="pi pi-arrow-right kpi-arrow"></i>
              </div>
            </div>

            <!-- Quick Action Tiles -->
            <div class="section-title">Quick Actions</div>
            <div class="action-grid">
              <div class="action-tile" *ngIf="isPharmacist() || isAdmin()" (click)="navigate('/dashboard/medicines')">
                <div class="action-icon teal-bg"><i class="pi pi-box"></i></div>
                <span>Medicine Inventory</span>
              </div>
              <div class="action-tile" *ngIf="isManager() || isAdmin()" (click)="navigate('/dashboard/purchases')">
                <div class="action-icon indigo-bg"><i class="pi pi-shopping-bag"></i></div>
                <span>New Purchase</span>
              </div>
              <div class="action-tile" *ngIf="isCashier() || isAdmin()" (click)="navigate('/dashboard/sales')">
                <div class="action-icon emerald-bg"><i class="pi pi-desktop"></i></div>
                <span>Point of Sale</span>
              </div>
              <div class="action-tile" *ngIf="isAdmin()" (click)="navigate('/dashboard/users')">
                <div class="action-icon purple-bg"><i class="pi pi-users"></i></div>
                <span>User Management</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════
       SHELL LAYOUT — explicit CSS (not Tailwind)
       ═══════════════════════════════════════════ */
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      background: #f1f5f9;
    }

    /* ─── Header ─── */
    .app-header {
      height: 64px;
      min-height: 64px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 50;
      box-shadow: 0 1px 0 rgba(255,255,255,.06);
    }
    .header-left  { display: flex; align-items: center; gap: 14px; }
    .header-right { display: flex; align-items: center; gap: 14px; }

    .sidebar-toggle {
      background: rgba(255,255,255,.08);
      border: none;
      color: #94a3b8;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      transition: background .15s, color .15s;
    }
    .sidebar-toggle:hover { background: rgba(255,255,255,.14); color: #fff; }

    .brand-icon {
      width: 38px; height: 38px;
      background: #ccfbf1;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .brand-text { display: flex; flex-direction: column; line-height: 1.2; }
    .brand-name { font-size: .95rem; font-weight: 700; color: #f8fafc; letter-spacing: -.01em; }
    .brand-sub  { font-size: .7rem;  color: #64748b; }

    .header-time { font-size: .75rem; color: #64748b; display: flex; align-items: center; gap: 4px; }

    .user-chip {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 12px;
      padding: 6px 14px 6px 8px;
    }
    .user-avatar {
      width: 30px; height: 30px;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      border-radius: 8px;
      color: #fff;
      font-size: .8rem;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .user-info  { display: flex; flex-direction: column; line-height: 1.25; }
    .user-name  { font-size: .8rem; font-weight: 600; color: #f1f5f9; }
    .user-role  { font-size: .68rem; color: #0d9488; font-weight: 500; }

    /* ─── Body ─── */
    .app-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* ─── Sidebar ─── */
    .app-sidebar {
      width: 240px;
      min-width: 240px;
      background: #1e293b;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width .25s cubic-bezier(.4,0,.2,1), min-width .25s cubic-bezier(.4,0,.2,1);
      z-index: 40;
    }
    .sidebar-collapsed { width: 0; min-width: 0; }

    .sidebar-nav {
      flex: 1;
      padding: 20px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .nav-section-label {
      font-size: .64rem;
      font-weight: 700;
      color: #475569;
      letter-spacing: .1em;
      padding: 4px 10px 10px;
      white-space: nowrap;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 10px;
      color: #94a3b8;
      font-size: .875rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: background .15s, color .15s, border-color .15s;
      border-left: 3px solid transparent;
      white-space: nowrap;
    }
    .nav-item:hover { background: #334155; color: #f1f5f9; }
    .nav-active {
      background: rgba(13,148,136,.15) !important;
      color: #2dd4bf !important;
      border-left-color: #0d9488 !important;
    }
    .nav-active .nav-icon { color: #0d9488 !important; }
    .nav-icon { font-size: 1rem; flex-shrink: 0; }
    .nav-label { flex: 1; }

    .sidebar-footer {
      padding: 16px 12px;
      border-top: 1px solid #334155;
    }
    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(239,68,68,.1);
      border: 1px solid rgba(239,68,68,.2);
      color: #f87171;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s, border-color .15s, color .15s;
      font-family: 'Inter', sans-serif;
    }
    .logout-btn:hover {
      background: rgba(239,68,68,.2);
      border-color: rgba(239,68,68,.4);
      color: #ef4444;
    }

    /* ─── Main ─── */
    .app-main {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 28px;
      display: flex;
      flex-direction: column;
    }

    /* ─── Dashboard Home ─── */
    .dashboard-home { display: flex; flex-direction: column; gap: 28px; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .page-title  { font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -.02em; }
    .page-sub    { font-size: .875rem; color: #64748b; margin: 0; }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 22px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: box-shadow .2s, transform .2s, border-color .2s;
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 4px; height: 100%;
      border-radius: 16px 0 0 16px;
    }
    .kpi-teal::before   { background: #0d9488; }
    .kpi-amber::before  { background: #f59e0b; }
    .kpi-emerald::before{ background: #10b981; }
    .kpi-indigo::before { background: #6366f1; }
    .kpi-card:hover { box-shadow: 0 8px 24px -4px rgba(0,0,0,.1); transform: translateY(-2px); }
    .kpi-card:hover.kpi-teal   { border-color: #0d9488; }
    .kpi-card:hover.kpi-amber  { border-color: #f59e0b; }
    .kpi-card:hover.kpi-emerald{ border-color: #10b981; }
    .kpi-card:hover.kpi-indigo { border-color: #6366f1; }

    .kpi-icon-wrap {
      width: 52px; height: 52px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }
    .kpi-teal-icon   { background: #ccfbf1; color: #0d9488; }
    .kpi-amber-icon  { background: #fef3c7; color: #d97706; }
    .kpi-emerald-icon{ background: #d1fae5; color: #059669; }
    .kpi-indigo-icon { background: #e0e7ff; color: #4f46e5; }

    .kpi-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .kpi-label { font-size: .72rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
    .kpi-value { font-size: 1.5rem; font-weight: 800; color: #0f172a; line-height: 1.1; }
    .kpi-meta  { font-size: .72rem; color: #94a3b8; }
    .kpi-arrow { color: #cbd5e1; font-size: .85rem; transition: color .2s; }
    .kpi-card:hover .kpi-arrow { color: #94a3b8; }

    /* Action Grid */
    .section-title { font-size: .8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .07em; }
    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 14px;
    }
    .action-tile {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 22px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all .2s;
      font-size: .875rem;
      font-weight: 600;
      color: #334155;
      text-align: center;
    }
    .action-tile:hover {
      box-shadow: 0 4px 16px -4px rgba(0,0,0,.12);
      transform: translateY(-2px);
      border-color: #94a3b8;
    }
    .action-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.35rem;
      color: #fff;
      transition: transform .2s;
    }
    .action-tile:hover .action-icon { transform: scale(1.08); }
    .teal-bg   { background: linear-gradient(135deg, #0d9488, #0f766e); }
    .indigo-bg { background: linear-gradient(135deg, #6366f1, #4f46e5); }
    .emerald-bg{ background: linear-gradient(135deg, #10b981, #059669); }
    .purple-bg { background: linear-gradient(135deg, #a855f7, #7c3aed); }
  `]
})
export class DashboardComponent implements OnInit {
  user: any;
  currentTime = '';
  medicineCount = 0;
  lowStockCount = 0;
  sidebarOpen = signal(true);

  constructor(
    private router: Router,
    private authService: AuthService,
    private medicineService: MedicineService
  ) {}

  ngOnInit() {
    this.user = this.authService.currentUserValue;
    this.updateTime();
    setInterval(() => this.updateTime(), 60000);

    if (this.isPharmacist() || this.isAdmin()) {
      this.medicineService.getMedicines().subscribe(data => {
        this.medicineCount = data.length;
        this.lowStockCount = data.filter((m: any) => m.stockQuantity < 10).length;
      });
    }
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  isRoot() { return this.router.url === '/dashboard'; }
  isAdmin()      { return this.authService.getRoles().includes('Admin'); }
  isPharmacist() { return this.authService.getRoles().includes('Pharmacist'); }
  isManager()    { return this.authService.getRoles().includes('Manager'); }
  isCashier()    { return this.authService.getRoles().includes('Cashier'); }

  navigate(path: string) { this.router.navigate([path]); }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}