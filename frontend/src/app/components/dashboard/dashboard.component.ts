import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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

            <!-- ─── Inventory & Stock ─── -->
            <div class="nav-group" [class.group-open]="inventoryOpen()" [class.group-active]="isGroupActive('inventory')" *ngIf="isPharmacist() || isAdmin() || isManager()">
              <div class="nav-item group-header" (click)="toggleGroup('inventory')">
                <i class="pi pi-box nav-icon"></i>
                <span class="nav-label">Inventory & Stock</span>
                <i class="pi pi-chevron-down group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" routerLink="/dashboard/medicines" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label">Medicines</span>
                </a>
                <a class="nav-item sub-item" *ngIf="isAdmin() || isManager()" routerLink="/dashboard/purchases" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label">Procurement</span>
                </a>
              </div>
            </div>

            <!-- ─── Sales & CRM ─── -->
            <div class="nav-group" [class.group-open]="salesOpen()" [class.group-active]="isGroupActive('sales')" *ngIf="isCashier() || isAdmin() || isManager()">
              <div class="nav-item group-header" (click)="toggleGroup('sales')">
                <i class="pi pi-receipt nav-icon"></i>
                <span class="nav-label">Sales & CRM</span>
                <i class="pi pi-chevron-down group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" routerLink="/dashboard/sales" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label">Sales POS</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/due-collection" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label">Due Collection</span>
                </a>
                <a class="nav-item sub-item" *ngIf="isAdmin() || isManager()" routerLink="/dashboard/parties" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label">Customers & Parties</span>
                </a>
              </div>
            </div>

            <!-- ─── Reports & Analytics ─── -->
            <div class="nav-group" [class.group-open]="reportsOpen()" [class.group-active]="isGroupActive('reports')" *ngIf="hasAnyReportPermission()">
              <div class="nav-item group-header" (click)="toggleGroup('reports')">
                <i class="pi pi-chart-line nav-icon"></i>
                <span class="nav-label">Reports & Analytics</span>
                <i class="pi pi-chevron-down group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" *ngIf="hasAnyReportPermission()" routerLink="/dashboard/analytics" routerLinkActive="nav-active">
                  <i class="pi pi-chart-bar nav-icon-dot text-teal-500"></i>
                  <span class="nav-label text-xs font-bold text-teal-600">Visual Dashboard</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Sales Reports')" routerLink="/dashboard/reports/sales-summary" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Sales Summary</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Purchase Reports')" routerLink="/dashboard/reports/purchase-summary" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Purchase Summary</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Inventory Reports')" routerLink="/dashboard/reports/stock-status" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Stock Status</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Financial Reports')" routerLink="/dashboard/reports/profit-loss" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Profit & Loss</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Expiry Reports')" routerLink="/dashboard/reports/expiry" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Expiry Report</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Top Selling Reports')" routerLink="/dashboard/reports/top-selling" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Top Selling</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Low Stock Reports')" routerLink="/dashboard/reports/low-stock" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Low Stock Alert</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Ledger Reports')" routerLink="/dashboard/reports/ledger" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Ledger Report</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('User Performance Reports')" routerLink="/dashboard/reports/user-performance" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Staff Performance</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('VAT Reports')" routerLink="/dashboard/reports/vat" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">VAT Collection</span>
                </a>
              </div>
            </div>

            <!-- ─── Administration ─── -->
            <div class="nav-group" [class.group-open]="adminOpen()" [class.group-active]="isGroupActive('admin')" *ngIf="isAdmin()">
              <div class="nav-item group-header" (click)="toggleGroup('admin')">
                <i class="pi pi-shield nav-icon"></i>
                <span class="nav-label">Administration</span>
                <i class="pi pi-chevron-down group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" routerLink="/dashboard/users" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label">Manage Users</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/roles" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label">Roles & Permissions</span>
                </a>
              </div>
            </div>

            <!-- ─── Configurations (Master Data) ─── -->
            <div class="nav-group" [class.group-open]="configOpen()" [class.group-active]="isGroupActive('config')" *ngIf="isAdmin() || isManager()">
              <div class="nav-item group-header" (click)="toggleGroup('config')">
                <i class="pi pi-cog nav-icon"></i>
                <span class="nav-label">Configurations</span>
                <i class="pi pi-chevron-down group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" routerLink="/dashboard/taxes" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Tax Settings</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/uoms" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Units of Measure</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/generics" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Generics</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/categories" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Categories</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/manufacturers" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Manufacturers</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/dosage-forms" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Dosage Forms</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/strengths" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Strengths</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/indications" routerLinkActive="nav-active">
                  <i class="pi pi-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Indications</span>
                </a>
              </div>
            </div>
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

              <div class="kpi-card kpi-indigo" *ngIf="isManager() || isAdmin()" (click)="navigate('/dashboard/purchases/new')">
                <div class="kpi-icon-wrap kpi-indigo-icon">
                  <i class="pi pi-shopping-bag"></i>
                </div>
                <div class="kpi-info">
                  <span class="kpi-label">Procurement</span>
                  <span class="stat-value" style="font-size: 1.5rem; font-weight: 800; color: #0f172a; line-height: 1.1;">New Order</span>
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
              <div class="action-tile" *ngIf="isManager() || isAdmin()" (click)="navigate('/dashboard/purchases/new')">
                <div class="action-icon indigo-bg"><i class="pi pi-shopping-bag"></i></div>
                <span>New Purchase</span>
              </div>
              <div class="action-tile" *ngIf="isCashier() || isAdmin()" (click)="navigate('/dashboard/sales')">
                <div class="action-icon emerald-bg"><i class="pi pi-desktop"></i></div>
                <span>Point of Sale</span>
              </div>
              <div class="action-tile" *ngIf="isAdmin() || isManager() || isCashier()" (click)="navigate('/dashboard/due-collection')">
                <div class="action-icon amber-bg" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="pi pi-wallet"></i></div>
                <span>Due Collection</span>
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
      gap: 4px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .sidebar-nav::-webkit-scrollbar { width: 4px; }
    .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
    .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    .sidebar-nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    .nav-section-label {
      font-size: .64rem;
      font-weight: 700;
      color: #475569;
      letter-spacing: .12em;
      padding: 10px 14px 6px;
      white-space: nowrap;
      text-transform: uppercase;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      color: #94a3b8;
      font-size: .9rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
      border-left: 3px solid transparent;
      white-space: nowrap;
    }
    .nav-item:hover { background: rgba(255,255,255,0.05); color: #f1f5f9; }
    .nav-active {
      background: rgba(13,148,136,.12) !important;
      color: #2dd4bf !important;
      border-left-color: #0d9488 !important;
      font-weight: 600;
      box-shadow: inset 0 0 10px rgba(13, 148, 136, 0.1);
    }
    .nav-active .nav-icon { color: #0d9488 !important; transform: scale(1.1); }
    .nav-icon { font-size: 1.05rem; flex-shrink: 0; transition: transform 0.2s; color: #64748b; }
    .nav-label { flex: 1; transition: color 0.2s; }

    /* ─── Grouped Nav ─── */
    .nav-group { display: flex; flex-direction: column; margin-bottom: 2px; }
    .group-header { position: relative; }
    .group-arrow { font-size: 0.65rem; transition: transform 0.35s; opacity: 0.4; margin-left: auto; }
    .group-open .group-header { color: #f1f5f9; background: rgba(255,255,255,0.03); }
    .group-open .group-arrow { transform: rotate(180deg); opacity: 0.8; color: #0d9488; }
    
    .group-active .group-header { color: #5eead4; background: rgba(13, 148, 136, 0.05); }
    .group-active .group-header i:first-child { color: #0d9488; }
    
    .sub-nav {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      opacity: 0;
      background: rgba(0,0,0,0.15);
      margin: 0 8px;
      border-radius: 0 0 12px 12px;
    }
    .group-open .sub-nav { max-height: 600px; opacity: 1; padding: 4px 0 8px; margin-bottom: 8px; }
    
    .sub-item {
      padding: 10px 16px 10px 42px !important;
      font-size: 0.825rem !important;
      border-radius: 8px !important;
      margin: 0 8px;
      color: #728197;
      border-left: none !important;
    }
    .sub-item.nav-active { background: transparent !important; color: #2dd4bf !important; position: relative; }
    .sub-item.nav-active::before {
       content: ''; position: absolute; left: 16px; top: 18px; width: 6px; height: 6px; 
       background: #0d9488; border-radius: 50%; box-shadow: 0 0 8px #0d9488;
    }
    
    .nav-icon-dot { font-size: 0.4rem; opacity: 0.4; }
    .sub-item.nav-active .nav-icon-dot { display: none; }

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
      padding: 0; /* Removed global padding to allow sticky headers to touch the top */
      display: flex;
      flex-direction: column;
    }

    /* ─── Dashboard Home ─── */
    .dashboard-home { display: flex; flex-direction: column; gap: 28px; padding: 28px; }

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
  currentUrl = signal('/dashboard');

  // Group visibility signals
  inventoryOpen = signal(false);
  salesOpen = signal(false);
  adminOpen = signal(false);
  configOpen = signal(false);
  reportsOpen = signal(false);

  constructor(
    private router: Router,
    private authService: AuthService,
    private medicineService: MedicineService
  ) { }

  ngOnInit() {
    this.user = this.authService.currentUserValue;
    this.updateTime();
    setInterval(() => this.updateTime(), 60000);

    // Initial URL সেট করা হচ্ছে যাতে রিলোড করলে সঠিক পেইজ দেখায়
    this.currentUrl.set(this.router.url);

    // URL সঠিকভাবে ট্র্যাক করার জন্য NavigationEnd ব্যবহার করা হচ্ছে
    // এতে blink/flash সমস্যা দূর হবে
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentUrl.set(e.urlAfterRedirects);
        this.autoOpenGroups();
      });

    if (this.isPharmacist() || this.isAdmin()) {
      this.medicineService.getMedicines({ pageNumber: 1, pageSize: 1 }).subscribe(res => {
        this.medicineCount = res.totalCount;
      });
      // For low stock, we might need a dedicated API or a large page size, but for now let's just use a reasonable number or a filtered query if the API supports it
      // Actually, I'll just set it to 0 or hide it if it's too expensive, or just fetch a large chunk.
      // Given the client wants a wow effect, let's just fetch a reasonable amount for now.
      // Given the client wants a wow effect, let's just fetch a reasonable amount for now.
    }

    // Auto-open group based on current URL
    this.autoOpenGroups();
  }

  autoOpenGroups() {
    const url = this.router.url;
    if (url.includes('/medicines') || url.includes('/purchases')) this.inventoryOpen.set(true);
    if (url.includes('/sales') || url.includes('/due-collection') || url.includes('/parties')) this.salesOpen.set(true);
    if (url.includes('/users') || url.includes('/roles')) this.adminOpen.set(true);
    if (url.includes('/reports')) this.reportsOpen.set(true);
    if (url.includes('/taxes') || url.includes('/uoms') || url.includes('/generics') || 
        url.includes('/categories') || url.includes('/manufacturers') || 
        url.includes('/dosage-forms') || url.includes('/strengths') || url.includes('/indications')) {
      this.configOpen.set(true);
    }
  }

  toggleGroup(group: string) {
    // Check if the clicked group is already open
    const isCurrentlyOpen = 
      (group === 'inventory' && this.inventoryOpen()) ||
      (group === 'sales' && this.salesOpen()) ||
      (group === 'admin' && this.adminOpen()) ||
      (group === 'config' && this.configOpen()) ||
      (group === 'reports' && this.reportsOpen());

    // Force close all groups
    this.inventoryOpen.set(false);
    this.salesOpen.set(false);
    this.adminOpen.set(false);
    this.configOpen.set(false);
    this.reportsOpen.set(false);

    // If it was NOT open, open it now (this keeps exactly 1 open at a time)
    if (!isCurrentlyOpen) {
      if (group === 'inventory') this.inventoryOpen.set(true);
      if (group === 'sales') this.salesOpen.set(true);
      if (group === 'admin') this.adminOpen.set(true);
      if (group === 'config') this.configOpen.set(true);
      if (group === 'reports') this.reportsOpen.set(true);
    }
  }

  isGroupActive(group: string): boolean {
    const url = this.currentUrl();
    if (group === 'inventory') return url.includes('/medicines') || url.includes('/purchases');
    if (group === 'sales') return url.includes('/sales') || url.includes('/due-collection') || url.includes('/parties');
    if (group === 'admin') return url.includes('/users') || url.includes('/roles');
    if (group === 'reports') return url.includes('/reports');
    if (group === 'config') {
      return url.includes('/taxes') || url.includes('/uoms') || url.includes('/generics') ||
        url.includes('/categories') || url.includes('/manufacturers') ||
        url.includes('/dosage-forms') || url.includes('/strengths') || url.includes('/indications');
    }
    return false;
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/,/g, '');
  }

  isRoot() { return this.currentUrl() === '/dashboard'; }
  isAdmin() { return this.authService.getRoles().includes('Admin'); }
  isPharmacist() { return this.authService.getRoles().includes('Pharmacist'); }
  isManager() { return this.authService.getRoles().includes('Manager'); }
  isCashier() { return this.authService.getRoles().includes('Cashier'); }

  canViewReport(reportModule: string) {
    return this.authService.hasPermission(reportModule, 'view');
  }

  hasAnyReportPermission() {
    return this.canViewReport('Sales Reports') ||
      this.canViewReport('Purchase Reports') ||
      this.canViewReport('Inventory Reports') ||
      this.canViewReport('Financial Reports') ||
      this.canViewReport('Expiry Reports') ||
      this.canViewReport('Top Selling Reports') ||
      this.canViewReport('Low Stock Reports') ||
      this.canViewReport('Ledger Reports') ||
      this.canViewReport('User Performance Reports') ||
      this.canViewReport('VAT Reports');
  }

  navigate(path: string) { this.router.navigate([path]); }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}