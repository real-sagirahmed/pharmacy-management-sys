import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MedicineListComponent } from './components/medicines/medicine-list.component';
import { PurchaseListComponent } from './components/purchases/purchase-list.component';
import { PurchaseFormComponent } from './components/purchases/purchase-form.component';
import { SalesFormComponent } from './components/sales/sales-form.component';
import { SalesListComponent } from './components/sales/sales-list.component';
import { DueCollectionComponent } from './components/due-collection/due-collection.component';
import { UserManagementComponent } from './components/dashboard/user-management/user-management.component';
import { RoleManagementComponent } from './components/dashboard/user-management/role-management.component';
import { AuthGuard } from './guards/auth.guard';

// ─── Master Data Components ───
import { PartyListComponent } from './components/parties/party-list.component';
import { TaxListComponent } from './components/taxes/tax-list.component';
import { UomListComponent } from './components/uoms/uom-list.component';
import { GenericListComponent } from './components/generics/generic-list.component';
import { CategoryListComponent } from './components/categories/category-list.component';
import { ManufacturerListComponent } from './components/manufacturers/manufacturer-list.component';
import { DosageFormListComponent } from './components/dosage-forms/dosage-form-list.component';
import { CommonStrengthListComponent } from './components/common-strengths/common-strength-list.component';
import { UseForListComponent } from './components/use-for/use-for-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'medicines',   component: MedicineListComponent },
      { path: 'purchases',       component: PurchaseListComponent },
      { path: 'purchases/new',   component: PurchaseFormComponent },
      { path: 'sales',       component: SalesListComponent },
      { path: 'sales/new',   component: SalesFormComponent },
      { path: 'sales/edit/:id', component: SalesFormComponent },
      { path: 'due-collection', component: DueCollectionComponent },
      
      // Reports
      { path: 'analytics', loadComponent: () => import('./components/analytics/visual-dashboard.component').then(m => m.VisualDashboardComponent) },
      { path: 'reports/sales-summary', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/purchase-summary', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/stock-status', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/profit-loss', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/expiry', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/top-selling', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/low-stock', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/ledger', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/user-performance', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },
      { path: 'reports/vat', loadComponent: () => import('./components/reports/report-viewer.component').then(m => m.ReportViewerComponent) },

      { path: 'users',       component: UserManagementComponent },
      { path: 'roles',       component: RoleManagementComponent },
      // ─── Master Data Routes ───
      { path: 'parties',    component: PartyListComponent },
      { path: 'taxes',      component: TaxListComponent },
      { path: 'uoms',       component: UomListComponent },
      { path: 'generics',   component: GenericListComponent },
      { path: 'categories', component: CategoryListComponent },
      { path: 'manufacturers', component: ManufacturerListComponent },
      { path: 'dosage-forms', component: DosageFormListComponent },
      { path: 'strengths', component: CommonStrengthListComponent },
      { path: 'indications', component: UseForListComponent }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

