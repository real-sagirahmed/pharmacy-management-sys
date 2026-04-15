import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MedicineService } from '../../services/medicine.service';
import { SalesService } from '../../services/sales.service';
import { ReportService } from '../../services/report.service';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { GlobalSearchComponent } from '../shared/global-search/global-search.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TooltipDirective, GlobalSearchComponent],
  providers: [CurrencyPipe, DatePipe],
  template: `

    <div class="app-shell" [class.is-mobile]="isMobile()" [class.sidebar-collapsed]="!sidebarOpen()">
      <!-- Mobile Backdrop -->
      <div class="sidebar-backdrop" *ngIf="isMobile() && sidebarOpen()" (click)="sidebarOpen.set(false)"></div>

      <!-- Welcome Overlay for users with NO permissions -->
      <div class="no-permissions-overlay" *ngIf="!isSystemAdmin() && !hasAnyModuleAccess()">
        <div class="no-perm-card animate-fade-in">
          <i class="pi pi-lock-open text-5xl text-amber-500 mb-4"></i>
          <h2 class="text-2xl font-bold text-slate-800">Account Initialized</h2>
          <p class="text-slate-600 max-w-sm mt-2">
            Your account is active, but your role permissions haven't been configured yet. 
            Please contact the <span class="font-bold text-teal-600">SystemAdmin</span> to grant you access.
          </p>
          <button class="logout-btn mt-6 w-auto px-8" (click)="logout()">
            <i class="pi pi-sign-out"></i> Log Out
          </button>
        </div>
      </div>

      <!-- ═══ TOP HEADER ═══ -->
      <header class="app-header">
        <div class="header-left">
          <button class="sidebar-toggle" (click)="sidebarOpen.set(!sidebarOpen())">
            <i class="pi pi-bars"></i>
          </button>
          <div class="brand-icon" [class.centered]="!sidebarOpen() && !isMobile()">
            <img src="/logo.png" alt="s7 Logo" class="logo-img">
          </div>
          <div class="brand-text" *ngIf="sidebarOpen() || isMobile()">
            <span class="brand-name">s7 Drug House</span>
            <span class="brand-sub" *ngIf="!isMobile()">Pharmacy System</span>
          </div>

        </div>


        <div class="header-right" *ngIf="user">
          <!-- Universal Search Trigger -->
          <button class="global-search-btn" (click)="globalSearch.toggle()" appTooltip="Global Search (Ctrl+K)">
            <i class="pi pi-search"></i>
            <span class="btn-text">Search...</span>
            <span class="btn-key">CtrlK</span>
          </button>

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
        <aside class="app-sidebar">
          <nav class="sidebar-nav">
            <div class="nav-section-label">NAVIGATION</div>

            <a class="nav-item" routerLink="/dashboard" *ngIf="isSystemAdmin() || hasPermission('Dashboard')"
               routerLinkActive="nav-active" [routerLinkActiveOptions]="{exact:true}"
               appTooltip="System Overview & Stats" [tooltipEnabled]="!sidebarOpen()">
              <i class="pi pi-home nav-icon"></i>
              <span class="nav-label">Dashboard</span>
            </a>

            <!-- ─── Inventory & Stock ─── -->
            <div class="nav-group" [class.group-open]="inventoryOpen()" [class.group-active]="isGroupActive('inventory')" *ngIf="isSystemAdmin() || hasPermission('Medicines') || hasPermission('Purchases')">
              <div class="nav-item group-header" (click)="toggleGroup('inventory')"
                   appTooltip="Stock & Procurement" [tooltipEnabled]="!sidebarOpen()">
                <i class="pi pi-box nav-icon"></i>
                <span class="nav-label">Inventory & Stock</span>
                <i class="pi pi-chevron-up group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" *ngIf="isSystemAdmin() || hasPermission('Medicines')" routerLink="/dashboard/medicines" routerLinkActive="nav-active"
                   appTooltip="Medicine List & Details" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-table nav-icon-dot"></i>
                  <span class="nav-label">Medicines</span>
                </a>
                <a class="nav-item sub-item" *ngIf="isSystemAdmin() || hasPermission('Purchases')" routerLink="/dashboard/purchases" routerLinkActive="nav-active"
                   appTooltip="New Purchase & Orders" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-truck nav-icon-dot"></i>
                  <span class="nav-label">Procurement</span>
                </a>
              </div>
            </div>

            <!-- ─── Sales & CRM ─── -->
            <div class="nav-group" [class.group-open]="salesOpen()" [class.group-active]="isGroupActive('sales')" *ngIf="isSystemAdmin() || hasPermission('Sales') || hasPermission('Due Collection') || hasPermission('Parties')">
              <div class="nav-item group-header" (click)="toggleGroup('sales')"
                   appTooltip="Transactions & Customers" [tooltipEnabled]="!sidebarOpen()">
                <i class="pi pi-receipt nav-icon"></i>
                <span class="nav-label">Sales & CRM</span>
                <i class="pi pi-chevron-up group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" *ngIf="isSystemAdmin() || hasPermission('Sales')" routerLink="/dashboard/sales" routerLinkActive="nav-active"
                   appTooltip="Retail Billing & POS" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-desktop nav-icon-dot"></i>
                  <span class="nav-label">Sales POS</span>
                </a>
                <a class="nav-item sub-item" *ngIf="isSystemAdmin() || hasPermission('Due Collection')" routerLink="/dashboard/due-collection" routerLinkActive="nav-active"
                   appTooltip="Due Collection Records" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-wallet nav-icon-dot"></i>
                  <span class="nav-label">Due Collection</span>
                </a>
                <a class="nav-item sub-item" *ngIf="isSystemAdmin() || hasPermission('Parties')" routerLink="/dashboard/parties" routerLinkActive="nav-active"
                   appTooltip="Client & Party Ledger" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-users nav-icon-dot"></i>
                  <span class="nav-label">Customers & Parties</span>
                </a>
              </div>
            </div>

            <!-- ─── Reports & Analytics ─── -->
            <div class="nav-group" [class.group-open]="reportsOpen()" [class.group-active]="isGroupActive('reports')" *ngIf="hasAnyReportPermission()">
              <div class="nav-item group-header" (click)="toggleGroup('reports')"
                   appTooltip="Performance Analytics" [tooltipEnabled]="!sidebarOpen()">
                <i class="pi pi-chart-line nav-icon"></i>
                <span class="nav-label">Reports & Analytics</span>
                <i class="pi pi-chevron-down group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" *ngIf="hasAnyReportPermission()" routerLink="/dashboard/analytics" routerLinkActive="nav-active" appTooltip="Visual Data Charts" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-chart-bar nav-icon-dot text-teal-400"></i>
                  <span class="nav-label text-xs font-bold text-teal-500">Visual Dashboard</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Sales Reports')" routerLink="/dashboard/reports/sales-summary" routerLinkActive="nav-active" appTooltip="Daily Sales Records" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-file-export nav-icon-dot"></i>
                  <span class="nav-label text-xs">Sales Summary</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Purchase Reports')" routerLink="/dashboard/reports/purchase-summary" routerLinkActive="nav-active" appTooltip="Procurement History" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-shopping-bag nav-icon-dot"></i>
                  <span class="nav-label text-xs">Purchase Summary</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Inventory Reports')" routerLink="/dashboard/reports/stock-status" routerLinkActive="nav-active" appTooltip="Live Stock Tracking" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-database nav-icon-dot"></i>
                  <span class="nav-label text-xs">Stock Status</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Financial Reports')" routerLink="/dashboard/reports/profit-loss" routerLinkActive="nav-active" appTooltip="Business Profit/Loss" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-percentage nav-icon-dot"></i>
                  <span class="nav-label text-xs">Profit & Loss</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Expiry Reports')" routerLink="/dashboard/reports/expiry" routerLinkActive="nav-active" appTooltip="Expiry Date Reports" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-calendar-times nav-icon-dot"></i>
                  <span class="nav-label text-xs">Expiry Report</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Top Selling Reports')" routerLink="/dashboard/reports/top-selling" routerLinkActive="nav-active" appTooltip="Best Business Items" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-star nav-icon-dot"></i>
                  <span class="nav-label text-xs">Top Selling</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Low Stock Reports')" routerLink="/dashboard/reports/low-stock" routerLinkActive="nav-active" appTooltip="Restock Notifications" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-exclamation-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Low Stock Alert</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('Ledger Reports')" routerLink="/dashboard/reports/ledger" routerLinkActive="nav-active" appTooltip="Detailed Ledger Book" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-book nav-icon-dot"></i>
                  <span class="nav-label text-xs">Ledger Report</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('User Performance Reports')" routerLink="/dashboard/reports/user-performance" routerLinkActive="nav-active" appTooltip="Employee Sales Data" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-user-edit nav-icon-dot"></i>
                  <span class="nav-label text-xs">Staff Performance</span>
                </a>
                <a class="nav-item sub-item" *ngIf="canViewReport('VAT Reports')" routerLink="/dashboard/reports/vat" routerLinkActive="nav-active" appTooltip="Government Tax Data" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-calculator nav-icon-dot"></i>
                  <span class="nav-label text-xs">VAT Collection</span>
                </a>
              </div>
            </div>

            <!-- Global Search Component -->
            <app-global-search #globalSearch></app-global-search>

            <!-- ─── Administration ─── -->
            <div class="nav-group" [class.group-open]="adminOpen()" [class.group-active]="isGroupActive('admin')" *ngIf="isSystemAdmin() || hasPermission('Users') || hasPermission('Roles')">
              <div class="nav-item group-header" (click)="toggleGroup('admin')"
                   appTooltip="Users & Access Control" [tooltipEnabled]="!sidebarOpen()">
                <i class="pi pi-shield nav-icon"></i>
                <span class="nav-label">Administration</span>
                <i class="pi pi-chevron-up group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" *ngIf="isSystemAdmin() || hasPermission('Users')" routerLink="/dashboard/users" routerLinkActive="nav-active" appTooltip="User Accounts & Access" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-user-plus nav-icon-dot"></i>
                  <span class="nav-label">Manage Users</span>
                </a>
                <a class="nav-item sub-item" *ngIf="isSystemAdmin()" routerLink="/dashboard/roles" routerLinkActive="nav-active" appTooltip="RBAC Logic & Security" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-lock nav-icon-dot"></i>
                  <span class="nav-label">Roles & Permissions</span>
                </a>
              </div>
            </div>

            <!-- ─── Configurations (Master Data) ─── -->
            <div class="nav-group" [class.group-open]="configOpen()" [class.group-active]="isGroupActive('config')" *ngIf="isSystemAdmin() || hasPermission('Master Data')">
              <div class="nav-item group-header" (click)="toggleGroup('config')"
                   appTooltip="System Settings" [tooltipEnabled]="!sidebarOpen()">
                <i class="pi pi-cog nav-icon"></i>
                <span class="nav-label">Configurations</span>
                <i class="pi pi-chevron-up group-arrow"></i>
              </div>
              <div class="sub-nav">
                <a class="nav-item sub-item" routerLink="/dashboard/taxes" routerLinkActive="nav-active" appTooltip="VAT & Tax Settings" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-percentage nav-icon-dot"></i>
                  <span class="nav-label text-xs">Tax Settings</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/uoms" routerLinkActive="nav-active" appTooltip="Measurement Units" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-sliders-h nav-icon-dot"></i>
                  <span class="nav-label text-xs">Units of Measure</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/generics" routerLinkActive="nav-active" appTooltip="Chemical Composition" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-info-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Generics</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/categories" routerLinkActive="nav-active" appTooltip="Medicine Categories" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-tags nav-icon-dot"></i>
                  <span class="nav-label text-xs">Categories</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/manufacturers" routerLinkActive="nav-active" appTooltip="Pharma Companies" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-building nav-icon-dot"></i>
                  <span class="nav-label text-xs">Manufacturers</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/dosage-forms" routerLinkActive="nav-active" appTooltip="Dosage (Tablet/Capsule)" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-filter nav-icon-dot"></i>
                  <span class="nav-label text-xs">Dosage Forms</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/strengths" routerLinkActive="nav-active" appTooltip="Power/Potency (mg/ml)" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-sort-amount-up nav-icon-dot"></i>
                  <span class="nav-label text-xs">Strengths</span>
                </a>
                <a class="nav-item sub-item" routerLink="/dashboard/indications" routerLinkActive="nav-active" appTooltip="Medical Recommendations" [tooltipEnabled]="!sidebarOpen()">
                  <i class="pi pi-question-circle nav-icon-dot"></i>
                  <span class="nav-label text-xs">Indications</span>
                </a>
              </div>
            </div>
          </nav>

          <div class="sidebar-footer">
            <button class="logout-btn" (click)="logout()" appTooltip="Exit System Safely" [tooltipEnabled]="!sidebarOpen()">
              <i class="pi pi-sign-out"></i>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <!-- ═══ MAIN CONTENT ═══ -->
        <main class="app-main" *ngIf="isSystemAdmin() || hasPermission('Dashboard')">
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
              <div class="kpi-card kpi-teal" *ngIf="isSystemAdmin() || hasPermission('Medicines')" (click)="navigate('/dashboard/medicines')">
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

              <div class="kpi-card kpi-amber" (click)="navigate('/dashboard/reports/low-stock')">
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


              <div class="kpi-card kpi-emerald" *ngIf="isSystemAdmin() || hasPermission('Sales')" (click)="navigate('/dashboard/reports/sales-summary')">
                <div class="kpi-icon-wrap kpi-emerald-icon">
                  <i class="pi pi-receipt"></i>
                </div>
                <div class="kpi-info">
                  <span class="kpi-label">Today's Sales</span>
                  <span class="kpi-value">{{ todaySalesAmount | currency:'Tk ' }}</span>
                  <span class="kpi-meta">revenue collected today</span>
                </div>
                <i class="pi pi-arrow-right kpi-arrow"></i>
              </div>

              <div class="kpi-card kpi-indigo" *ngIf="isSystemAdmin() || hasPermission('Sales')" (click)="navigate('/dashboard/sales')">
                <div class="kpi-icon-wrap kpi-indigo-icon">
                  <i class="pi pi-shopping-cart"></i>
                </div>
                <div class="kpi-info">
                  <span class="kpi-label">Today's Orders</span>
                  <span class="kpi-value">{{ todayOrderCount }}</span>
                  <span class="kpi-meta">completed transactions</span>
                </div>
              </div>
            </div>

            <!-- Quick Action Tiles -->
            <div class="section-title">Quick Actions</div>
            <div class="action-grid">
              <div class="action-tile" *ngIf="isSystemAdmin() || hasPermission('Medicines')" (click)="navigate('/dashboard/medicines')">
                <div class="action-icon teal-bg"><i class="pi pi-box"></i></div>
                <span>Medicine Inventory</span>
              </div>
              <div class="action-tile" *ngIf="isSystemAdmin() || hasPermission('Purchases')" (click)="navigate('/dashboard/purchases/new')">
                <div class="action-icon indigo-bg"><i class="pi pi-shopping-bag"></i></div>
                <span>New Purchase</span>
              </div>
              <div class="action-tile" *ngIf="isSystemAdmin() || hasPermission('Sales')" (click)="navigate('/dashboard/sales')">
                <div class="action-icon emerald-bg"><i class="pi pi-desktop"></i></div>
                <span>Point of Sale</span>
              </div>
              <div class="action-tile" *ngIf="isSystemAdmin() || hasPermission('Due Collection')" (click)="navigate('/dashboard/due-collection')">
                <div class="action-icon amber-bg" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="pi pi-wallet"></i></div>
                <span>Due Collection</span>
              </div>
              <div class="action-tile" *ngIf="isSystemAdmin() || hasPermission('Users')" (click)="navigate('/dashboard/users')">
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
      background: #1e293b; /* Softer Navy instead of Jet Black */
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 1002; /* Must be ABOVE sidebar-backdrop and sidebar */
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
      width: 42px; height: 42px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.3s ease;
    }
    .brand-icon.centered { margin: 8px auto 4px; width: 44px; height: 44px; }
    .logo-img { width: 100%; height: 100%; object-fit: contain; }

    .brand-text { display: flex; flex-direction: column; line-height: 1.2; transition: opacity 0.3s; }
    .brand-name { font-size: .95rem; font-weight: 700; color: #f8fafc; letter-spacing: -.01em; }
    .brand-sub  { font-size: .7rem;  color: #94a3b8; }

    .header-time { 
      font-size: .75rem; color: #64748b; display: flex; align-items: center; gap: 4px;
      @media (max-width: 768px) { display: none; }
    }


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

    @media (max-width: 640px) {
      .user-info { display: none; }
      .user-chip { padding: 4px; border-radius: 50%; max-height: 40px; margin-left: 0; gap: 0; }
      .user-avatar { border-radius: 50%; }
    }

    /* ─── Body ─── */
    .app-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* ─── Sidebar Core Layout ─── */
    .app-sidebar {
      width: 250px;
      min-width: 250px;
      background: rgba(30, 41, 59, 0.95);
      -webkit-backdrop-filter: blur(16px);
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      z-index: 1000;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      transition: width .3s cubic-bezier(.4,0,.2,1), min-width .3s cubic-bezier(.4,0,.2,1), transform .3s cubic-bezier(.4,0,.2,1);
    }
    
    .app-shell.sidebar-collapsed:not(.is-mobile) .app-sidebar { 
      width: 74px; 
      min-width: 74px;
      overflow: visible; /* Allows tooltips to escape sidebar boundary */
    }
    
    /* ─── Mobile Sidebar & Overlay Fix ─── */
    .app-shell.is-mobile .app-sidebar {
      position: fixed;
      top: 64px;
      left: 0;
      height: calc(100vh - 64px);
      z-index: 1001; /* Above backdrop but below header */
      box-shadow: 20px 0 50px rgba(0,0,0,0.2);
    }
    
    /* Hide sidebar completely on mobile when collapsed */
    .app-shell.is-mobile.sidebar-collapsed .app-sidebar {
      transform: translateX(-100%);
      pointer-events: none;
    }
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4); 
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
      z-index: 999;
      animation: fadeIn 0.2s ease-out;
      cursor: pointer;
    }
    
    /* ─── Sidebar Nav: scrollable middle section ─── */
    .sidebar-nav {
      flex: 1;
      min-height: 0; /* Critical: allows flex child to shrink and scroll */
      padding: 20px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .sidebar-nav::-webkit-scrollbar { width: 4px; }
    .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
    .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
    .sidebar-nav::-webkit-scrollbar-thumb:hover { background: #0d9488; }

    /* ─── Sidebar Footer: always pinned at bottom ─── */
    .sidebar-footer {
      flex-shrink: 0;
      padding: 16px 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
      background: rgba(30, 41, 59, 0.95);
      z-index: 10;
    }

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
      margin: 0 10px;
      border-radius: 12px;
      color: #94a3b8;
      font-size: .875rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      position: relative;
    }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #f1f5f9; }
    .nav-active {
      background: rgba(13, 148, 136, 0.15) !important;
      color: #5eead4 !important;
      font-weight: 600;
      box-shadow: inset 0 0 12px rgba(13, 148, 136, 0.1);
    }
    .nav-active::after {
      content: '';
      position: absolute;
      left: -8px;
      top: 20%;
      height: 60%;
      width: 3px;
      background: #0d9488;
      border-radius: 0 4px 4px 0;
      box-shadow: 0 0 10px #0d9488;
    }
    
    .nav-active .nav-icon { color: #2dd4bf !important; transform: scale(1.1); filter: drop-shadow(0 0 8px rgba(45, 212, 191, 0.4)); }
    .nav-icon { font-size: 1.15rem; flex-shrink: 0; transition: transform 0.2s, color 0.2s; color: #cbd5e1; }
    .nav-label { flex: 1; transition: opacity 0.3s; white-space: nowrap; font-weight: 500; }
    .app-shell.sidebar-collapsed:not(.is-mobile) .nav-label { opacity: 0; visibility: hidden; width: 0; }
    .app-shell.sidebar-collapsed:not(.is-mobile) .nav-item { padding: 12px 14px; justify-content: center; margin: 2px 8px; }
    .app-shell.sidebar-collapsed:not(.is-mobile) .nav-section-label { opacity: 0; height: 0; padding: 0; margin: 0; }
    .app-shell.sidebar-collapsed:not(.is-mobile) .group-arrow { display: none; }


    /* ─── Grouped Nav ─── */
    .nav-group { display: flex; flex-direction: column; margin-bottom: 2px; }
    .group-header { position: relative; }
    .group-arrow { font-size: 0.65rem; transition: transform 0.35s; opacity: 0.4; margin-left: auto; }
    .group-open .group-header { color: #f1f5f9; background: rgba(255,255,255,0.03); }
    .group-open .group-arrow { transform: rotate(180deg); opacity: 0.8; color: #0d9488; }
    
    .group-active .group-header { color: #5eead4; background: rgba(13, 148, 136, 0.05); }
    .group-active .group-header .nav-icon { color: #5eead4 !important; transform: scale(1.1); filter: drop-shadow(0 0 5px rgba(94, 234, 212, 0.3)); }
    
    .app-shell.sidebar-collapsed:not(.is-mobile) .group-header { padding: 12px 14px; justify-content: center; }
    
    .sub-nav {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      opacity: 0;
      background: rgba(0,0,0,0.15);
      margin: 0 8px;
      border-radius: 0 0 12px 12px;
    }
    .group-open .sub-nav { max-height: 1000px; opacity: 1; padding: 4px 0 8px; margin-bottom: 8px; }

    /* Hierarchy Differentiation */
    .nav-icon-dot { font-size: 0.85rem; opacity: 0.5; color: #94a3b8; transition: all 0.2s ease; }
    .sub-item:hover .nav-icon-dot { opacity: 1; transform: scale(1.1); color: #f1f5f9; }
    .sub-item.nav-active .nav-icon-dot { color: #5eead4; opacity: 1; font-size: 0.95rem; filter: drop-shadow(0 0 5px rgba(94, 234, 212, 0.3)); }
    
    /* Smart Sub-menu in Collapsed Mode */
    .app-shell.sidebar-collapsed:not(.is-mobile) .sub-nav { 
      display: flex !important; 
      flex-direction: column; 
      background: transparent;
      margin: 0;
      overflow: hidden; /* Don't break scroll container */
    }
    .app-shell.sidebar-collapsed:not(.is-mobile) .sub-item {
       padding: 10px 0 !important;
       justify-content: center;
       margin: 2px 4px;
    }
    .app-shell.sidebar-collapsed:not(.is-mobile) .sub-item .nav-icon-dot { font-size: 0.9rem; }
    
    /* Tooltip fix: use overflow visible only on individual hovered items via z-index */
    .app-shell.sidebar-collapsed:not(.is-mobile) [data-tooltip]:hover {
      overflow: visible;
      z-index: 1100;
    }
    .app-shell.sidebar-collapsed:not(.is-mobile) .sidebar-footer {
      padding: 12px 0;
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
    .logout-btn:hover { background: rgba(239,68,68,.2); border-color: rgba(239,68,68,.4); color: #ef4444; }
    .app-shell.sidebar-collapsed:not(.is-mobile) .logout-btn span { display: none; }
    .app-shell.sidebar-collapsed:not(.is-mobile) .logout-btn { padding: 10px 0; width: 44px; margin: 0 auto; height: 44px; border-radius: 12px; }

    /* ─── Tooltip Styling ─── */
    [data-tooltip] { position: relative; }
    [data-tooltip]::before {
      content: attr(data-tooltip);
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%) translateX(10px);
      padding: 8px 14px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      color: #f8fafc;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 8px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1000;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
      font-family: 'Inter', sans-serif;
    }
    [data-tooltip]::after {
      content: '';
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%) translateX(5px);
      border: 5px solid transparent;
      border-right-color: rgba(15, 23, 42, 0.95);
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1000;
      pointer-events: none;
    }
    [data-tooltip]:hover::before, [data-tooltip]:hover::after {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%) translateX(15px);
    }
    [data-tooltip]:hover::after {
      transform: translateY(-50%) translateX(10px);
    }

    /* ─── Layout Z-Index Polish ─── */
    .app-shell.sidebar-collapsed .nav-item:hover {
      z-index: 1010; /* Ensures the hovered item and its tooltip stay on top of others */
    }

    /* ─── Main ─── */
    .app-main {
      flex: 1;
      overflow-y: auto;
      overflow-x: auto;
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

    /* Global Search Button */
    .global-search-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.04);
      border: 1px solid rgba(15, 23, 42, 0.1);
      padding: 8px 16px;
      border-radius: 24px;
      cursor: pointer;
      margin-right: 1.5rem;
      transition: all 0.25s ease;
      color: #64748b;
    }
    .global-search-btn:hover {
      background: rgba(15, 23, 42, 0.08);
      border-color: rgba(15, 23, 42, 0.2);
      color: #0f172a;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .global-search-btn .pi-search {
      font-size: 1.1rem;
    }
    .btn-text {
      font-weight: 600;
      font-size: 0.9rem;
      letter-spacing: -0.2px;
    }
    .btn-key {
      background: #fff;
      border: 1px solid #cbd5e1;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      color: #475569;
      box-shadow: 0 2px 0 rgba(0,0,0,0.05);
    }
    
    @media (max-width: 640px) {
      .global-search-btn {
        margin-right: 0.5rem;
        padding: 8px;
        border-radius: 50%;
        gap: 0;
        width: 36px;
        height: 36px;
        justify-content: center;
      }
      .global-search-btn .pi-search { margin-left: 2px; }
      .btn-text, .btn-key { display: none; }
    }

    /* Empty state overlay */
    .no-permissions-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
    }
    .no-perm-card {
      background: white;
      padding: 3rem;
      border-radius: 24px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.1);
      border: 1px solid #e2e8f0;
      max-width: 450px;
    }
    .animate-fade-in {
      animation: fadeIn 0.5s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
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
  isMobile = signal(false);
  currentUrl = signal('/dashboard');


  // Group visibility signals
  inventoryOpen = signal(false);
  salesOpen = signal(false);
  adminOpen = signal(false);
  configOpen = signal(false);
  reportsOpen = signal(false);

  todaySalesAmount = 0;
  todayOrderCount = 0;

  constructor(
    private router: Router,
    private authService: AuthService,
    private medicineService: MedicineService,
    private salesService: SalesService,
    private reportService: ReportService,
    private datePipe: DatePipe
  ) { }


  ngOnInit() {
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
    
    this.user = this.authService.currentUserValue;

    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

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

    if (this.isSystemAdmin() || this.hasPermission('Medicines')) {
      this.medicineService.getMedicines({ pageNumber: 1, pageSize: 1 }).subscribe(res => {
        this.medicineCount = res.totalCount;
      });
      this.reportService.getLowStockReport().subscribe(res => {
        this.lowStockCount = res.length;
      });
    }

    if (this.isSystemAdmin() || this.hasPermission('Sales')) {
      this.fetchTodayStats();
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
    const sections = url.split('/');
    const mainSection = sections[2] || ''; // 'dashboard/{mainSection}/...'

    if (group === 'inventory') return mainSection === 'medicines' || mainSection === 'purchases';
    if (group === 'sales') return mainSection === 'sales' || mainSection === 'due-collection' || mainSection === 'parties';
    if (group === 'admin') return mainSection === 'users' || mainSection === 'roles';
    if (group === 'reports') return mainSection === 'reports' || mainSection === 'analytics';
    if (group === 'config') {
      const configSections = ['taxes', 'uoms', 'generics', 'categories', 'manufacturers', 'dosage-forms', 'strengths', 'indications'];
      return configSections.includes(mainSection);
    }
    return false;
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/,/g, '');
  }

  isRoot() { return this.currentUrl() === '/dashboard'; }
  isSystemAdmin() { return this.authService.isSystemAdmin(); }
  isAdminOrAbove() { return this.authService.isAdminOrAbove(); }

  hasPermission(module: string, action: any = 'view') {
    return this.authService.hasPermission(module, action);
  }

  hasAnyModuleAccess(): boolean {
    const modules = ['Medicines', 'Purchases', 'Sales', 'Due Collection', 'Parties', 'Users', 'Roles', 'Master Data'];
    return modules.some(m => this.hasPermission(m));
  }

  fetchTodayStats() {
    const today = this.datePipe.transform(new Date(), 'yyyy-MM-dd') || '';
    this.salesService.getSalesPaged({ fromDate: today, toDate: today, pageNumber: 1, pageSize: 1000 }).subscribe({
      next: (res) => {
        this.todayOrderCount = res.totalCount;
        this.todaySalesAmount = res.items.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
      },
      error: (err) => console.error('Error fetching today stats', err)
    });
  }

  navigate(url: string) {
    this.router.navigate([url]);
  }


  canViewReport(reportModule: string) {
    return this.authService.hasPermission(reportModule, 'view');
  }

  hasAnyReportPermission() {
    const reportModules = [
      'Sales Reports', 'Purchase Reports', 'Inventory Reports', 'Financial Reports',
      'Expiry Reports', 'Top Selling Reports', 'Low Stock Reports', 'Ledger Reports', 
      'User Performance Reports', 'VAT Reports'
    ];
    return reportModules.some(m => this.canViewReport(m));
  }


  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private checkMobile() {
    const mobile = window.innerWidth < 1024;
    this.isMobile.set(mobile);
    if (mobile) this.sidebarOpen.set(false);
  }
}