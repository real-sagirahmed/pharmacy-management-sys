import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MedicineListComponent } from './components/medicines/medicine-list.component';
import { PurchaseFormComponent } from './components/purchases/purchase-form.component';
import { SalesFormComponent } from './components/sales/sales-form.component';
import { UserManagementComponent } from './components/dashboard/user-management/user-management.component';
import { AuthGuard } from './guards/auth.guard';

// ─── Master Data Components ───
import { PartyListComponent } from './components/parties/party-list.component';
import { TaxListComponent } from './components/taxes/tax-list.component';
import { UomListComponent } from './components/uoms/uom-list.component';
import { GenericListComponent } from './components/generics/generic-list.component';
import { CategoryListComponent } from './components/categories/category-list.component';

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
      { path: 'purchases',   component: PurchaseFormComponent },
      { path: 'sales',       component: SalesFormComponent },
      { path: 'users',       component: UserManagementComponent },
      // ─── Master Data Routes ───
      { path: 'parties',    component: PartyListComponent },
      { path: 'taxes',      component: TaxListComponent },
      { path: 'uoms',       component: UomListComponent },
      { path: 'generics',   component: GenericListComponent },
      { path: 'categories', component: CategoryListComponent },
      { path: '', redirectTo: 'medicines', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

