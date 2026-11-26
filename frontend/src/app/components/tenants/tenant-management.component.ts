import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService, TenantListDto, CreateTenantRequest } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tenant-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    TagModule, DialogModule, SelectModule, ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="page-wrap animate-fadein-up" *ngIf="auth.isSystemAdmin()">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <div class="sticky-header">
        <div class="page-head pt-2 pb-2 px-4 flex justify-between items-center">
          <div>
            <h1 class="page-title">Pharmacies & SaaS Tenants</h1>
            <p class="page-sub text-xs">Onboard client pharmacies, manage subscriptions, white-label branding & logos.</p>
          </div>
          <div class="flex items-center gap-2">
            <button pButton icon="pi pi-plus" label="New Pharmacy Tenant" class="p-button-sm p-button-success"
                    (click)="openCreateDialog()"></button>
          </div>
        </div>

        <div class="table-toolbar px-4 py-2 flex justify-between items-center flex-wrap gap-3">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchText" placeholder="Search pharmacy, email or plan..." class="p-inputtext-sm" />
          </span>
          <div class="flex gap-2">
            <span class="chip chip-slate">Total: {{ tenants().length }}</span>
            <span class="chip chip-emerald">Active: {{ activeCount() }}</span>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4">
        <div class="table-card">
          <p-table [value]="filteredTenants()" [loading]="loading()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Pharmacy</th>
                <th>Plan & Expiry</th>
                <th>Branches</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-t>
              <tr>
                <td>
                  <div class="font-bold text-slate-800">{{ t.pharmacyName }}</div>
                  <div class="text-xs text-slate-500">{{ t.email || '—' }} · {{ t.phone || '—' }}</div>
                </td>
                <td>
                  <p-tag [value]="t.subscriptionPlan" severity="info"></p-tag>
                  <div class="text-xs text-slate-500 mt-1">
                    Exp: {{ t.subscriptionExpiry ? (t.subscriptionExpiry | date:'dd-MMM-yyyy') : 'Unlimited' }}
                  </div>
                </td>
                <td><span class="badge badge-slate">{{ t.branchCount }} branches</span></td>
                <td>
                  <p-tag [value]="t.isActive ? 'Active' : 'Suspended'" [severity]="t.isActive ? 'success' : 'danger'"></p-tag>
                </td>
                <td class="text-right">
                  <div class="flex justify-end gap-2">
                    <button pButton icon="pi pi-image" class="p-button-text p-button-sm" title="Upload Logo"
                            (click)="triggerLogoUpload(t.tenantId)"></button>
                    <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm p-button-info" title="Edit Tenant"
                            (click)="openEditDialog(t.tenantId)"></button>
                    <button pButton [icon]="t.isActive ? 'pi pi-ban' : 'pi pi-check'"
                            [class]="t.isActive ? 'p-button-text p-button-sm p-button-danger' : 'p-button-text p-button-sm p-button-success'"
                            [title]="t.isActive ? 'Suspend' : 'Activate'"
                            (click)="toggleStatus(t)"></button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>

      <input type="file" #logoInput style="display: none" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" (change)="onLogoSelected($event)" />

      <!-- Create Tenant + Atomic Onboarding Dialog -->
      <p-dialog [(visible)]="showCreateDialog" [modal]="true" header="Onboard New Pharmacy" [style]="{width: '640px'}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div class="field">
            <label>Pharmacy Name *</label>
            <input pInputText [(ngModel)]="createForm.pharmacyName" class="w-full" />
          </div>
          <div class="field">
            <label>Slogan / Tagline</label>
            <input pInputText [(ngModel)]="createForm.slogan" class="w-full" />
          </div>
          <div class="field">
            <label>Head Office Branch Name</label>
            <input pInputText [(ngModel)]="createForm.headOfficeBranchName" placeholder="Main Branch" class="w-full" />
          </div>
          <div class="field">
            <label>Brand Color</label>
            <div class="flex items-center gap-2">
              <input type="color" [(ngModel)]="createForm.primaryColor" style="width: 44px; height: 36px; border: 0; background: transparent;" />
              <input pInputText [(ngModel)]="createForm.primaryColor" class="w-full" />
            </div>
          </div>
          <div class="field">
            <label>Email</label>
            <input pInputText [(ngModel)]="createForm.email" class="w-full" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input pInputText [(ngModel)]="createForm.phone" class="w-full" />
          </div>
          <div class="field">
            <label>Subscription Plan</label>
            <p-select [options]="plans" [(ngModel)]="createForm.subscriptionPlan" styleClass="w-full"></p-select>
          </div>
          <div class="field">
            <label>Subscription Expiry</label>
            <input type="date" [(ngModel)]="createExpiryDate" class="p-inputtext w-full" />
          </div>
          <div class="field md:col-span-2">
            <label>Address</label>
            <input pInputText [(ngModel)]="createForm.address" class="w-full" />
          </div>
          <div class="field">
            <label>Drug License No</label>
            <input pInputText [(ngModel)]="createForm.drugLicenseNo" class="w-full" />
          </div>
          <div class="field">
            <label>Invoice Footer</label>
            <input pInputText [(ngModel)]="createForm.invoiceFooter" class="w-full" />
          </div>
        </div>

        <hr class="my-3 border-slate-200" />
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">Initial Pharmacy Admin (Optional — Atomic All-or-None)</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="field">
            <label>Admin Full Name</label>
            <input pInputText [(ngModel)]="createForm.adminFullName" class="w-full" />
          </div>
          <div class="field">
            <label>Admin Username</label>
            <input pInputText [(ngModel)]="createForm.adminUserName" class="w-full" />
          </div>
          <div class="field">
            <label>Admin Email</label>
            <input pInputText [(ngModel)]="createForm.adminEmail" class="w-full" />
          </div>
          <div class="field">
            <label>Admin Password (min 6)</label>
            <input type="password" pInputText [(ngModel)]="createForm.adminPassword" class="w-full" />
          </div>
        </div>

        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="showCreateDialog = false"></button>
          <button pButton label="Create Pharmacy" class="p-button-success" [loading]="saving" (click)="saveNewTenant()"></button>
        </ng-template>
      </p-dialog>

      <!-- Edit Tenant Dialog -->
      <p-dialog [(visible)]="showEditDialog" [modal]="true" header="Edit Pharmacy & White-Label Config" [style]="{width: '560px'}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2" *ngIf="editTarget">
          <div class="field md:col-span-2 flex items-center gap-3" *ngIf="editLogoPreview">
            <img [src]="editLogoPreview" alt="Logo" style="height: 44px; max-width: 140px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px;" />
            <span class="text-xs text-slate-500">Current uploaded logo</span>
          </div>
          <div class="field">
            <label>Pharmacy Name *</label>
            <input pInputText [(ngModel)]="editForm.pharmacyName" class="w-full" />
          </div>
          <div class="field">
            <label>Slogan / Tagline</label>
            <input pInputText [(ngModel)]="editForm.slogan" class="w-full" />
          </div>
          <div class="field">
            <label>Brand Color</label>
            <div class="flex items-center gap-2">
              <input type="color" [(ngModel)]="editForm.primaryColor" style="width: 44px; height: 36px; border: 0; background: transparent;" />
              <input pInputText [(ngModel)]="editForm.primaryColor" class="w-full" />
            </div>
          </div>
          <div class="field">
            <label>Subscription Plan</label>
            <p-select [options]="plans" [(ngModel)]="editForm.subscriptionPlan" styleClass="w-full"></p-select>
          </div>
          <div class="field">
            <label>Subscription Expiry</label>
            <input type="date" [(ngModel)]="editExpiryDate" class="p-inputtext w-full" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input pInputText [(ngModel)]="editForm.phone" class="w-full" />
          </div>
          <div class="field">
            <label>Email</label>
            <input pInputText [(ngModel)]="editForm.email" class="w-full" />
          </div>
          <div class="field">
            <label>Drug License No</label>
            <input pInputText [(ngModel)]="editForm.drugLicenseNo" class="w-full" />
          </div>
          <div class="field md:col-span-2">
            <label>Address</label>
            <input pInputText [(ngModel)]="editForm.address" class="w-full" />
          </div>
          <div class="field md:col-span-2">
            <label>Invoice Footer</label>
            <input pInputText [(ngModel)]="editForm.invoiceFooter" class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="showEditDialog = false"></button>
          <button pButton label="Save Changes" class="p-button-info" [loading]="saving" (click)="updateTenant()"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .page-wrap { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; }
    .sticky-header { background: #fff; border-bottom: 2px solid #e2e8f0; border-radius: 12px 12px 0 0; }
    .page-title { font-size: 1.15rem; font-weight: 800; margin: 0; color: #1e293b; }
    .page-sub { margin: 0; color: #475569; }
    .table-card { background: #fff; border-radius: 12px; padding: 0.75rem; border: 1px solid #e2e8f0; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    .field label { font-size: 0.75rem; font-weight: 700; color: #334155; }
    .chip { padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; }
    .chip-slate { background: #f1f5f9; color: #334155; }
    .chip-emerald { background: #d1fae5; color: #065f46; }
  `]
})
export class TenantManagementComponent implements OnInit {
  tenants = signal<TenantListDto[]>([]);
  loading = signal(false);
  saving = false;
  searchText = '';

  plans = ['Trial', 'Basic', 'Pro', 'Enterprise'];

  showCreateDialog = false;
  createForm: CreateTenantRequest = this.blankCreateForm();
  createExpiryDate = '';

  showEditDialog = false;
  editTarget: any = null;
  editForm: any = {};
  editExpiryDate = '';
  editLogoPreview: string | null = null;

  private pendingLogoTenantId: number | null = null;

  filteredTenants = computed(() => {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.tenants();
    return this.tenants().filter(t =>
      t.pharmacyName?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.subscriptionPlan?.toLowerCase().includes(q)
    );
  });

  activeCount = computed(() => this.tenants().filter(t => t.isActive).length);

  constructor(
    private tenantService: TenantService,
    public auth: AuthService,
    private msg: MessageService,
    private confirm: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadTenants();
  }

  private blankCreateForm(): CreateTenantRequest {
    return {
      pharmacyName: '',
      slogan: '',
      headOfficeBranchName: 'Main Branch',
      primaryColor: '#007070',
      subscriptionPlan: 'Trial',
      address: '',
      phone: '',
      email: '',
      drugLicenseNo: '',
      invoiceFooter: 'Thank you for choosing us!',
      adminFullName: '',
      adminUserName: '',
      adminEmail: '',
      adminPassword: ''
    };
  }

  loadTenants(): void {
    if (!this.auth.isSystemAdmin()) return;
    this.loading.set(true);
    this.tenantService.getAll().subscribe({
      next: res => { this.tenants.set(res); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load pharmacies.' });
      }
    });
  }

  openCreateDialog(): void {
    this.createForm = this.blankCreateForm();
    this.createExpiryDate = '';
    this.showCreateDialog = true;
  }

  saveNewTenant(): void {
    if (!this.createForm.pharmacyName?.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Pharmacy Name is required.' });
      return;
    }

    const payload: CreateTenantRequest = {
      ...this.createForm,
      subscriptionExpiry: this.createExpiryDate ? `${this.createExpiryDate}T23:59:59` : null
    };

    if (!payload.adminUserName?.trim()) {
      delete payload.adminUserName;
      delete payload.adminFullName;
      delete payload.adminEmail;
      delete payload.adminPassword;
    }

    this.saving = true;
    this.tenantService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.showCreateDialog = false;
        this.msg.add({ severity: 'success', summary: 'Created', detail: 'Pharmacy onboarded cleanly.' });
        this.loadTenants();
      },
      error: (err) => {
        this.saving = false;
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || err.error || 'Failed to create pharmacy.' });
      }
    });
  }

  openEditDialog(tenantId: number): void {
    this.tenantService.getById(tenantId).subscribe({
      next: (t) => {
        this.editTarget = t;
        this.editForm = {
          pharmacyName: t.pharmacyName,
          slogan: t.slogan || '',
          address: t.headOfficeAddress || '',
          phone: t.phone || '',
          email: t.email || '',
          drugLicenseNo: t.drugLicenseNo || '',
          invoiceFooter: t.invoiceFooter || '',
          primaryColor: t.primaryColor || '#007070',
          subscriptionPlan: t.subscriptionPlan || 'Trial'
        };
        this.editExpiryDate = t.subscriptionExpiry ? String(t.subscriptionExpiry).substring(0, 10) : '';
        this.editLogoPreview = t.logoPath ? `${environment.apiUrl.replace('/api', '')}${t.logoPath}` : null;
        this.showEditDialog = true;
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tenant details.' })
    });
  }

  updateTenant(): void {
    if (!this.editTarget) return;
    this.saving = true;
    const payload = {
      ...this.editForm,
      subscriptionExpiry: this.editExpiryDate ? `${this.editExpiryDate}T23:59:59` : null
    };
    this.tenantService.update(this.editTarget.tenantId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.showEditDialog = false;
        this.msg.add({ severity: 'success', summary: 'Updated', detail: 'Pharmacy settings updated.' });
        this.loadTenants();
      },
      error: (err) => {
        this.saving = false;
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Update failed.' });
      }
    });
  }

  toggleStatus(t: TenantListDto): void {
    const next = !t.isActive;
    this.confirm.confirm({
      message: `Are you sure you want to <b>${next ? 'Activate' : 'Suspend'}</b> ${t.pharmacyName}?`,
      header: 'Confirm Status',
      accept: () => {
        this.tenantService.setStatus(t.tenantId, next).subscribe({
          next: () => {
            this.msg.add({ severity: 'success', summary: 'Updated', detail: `Tenant ${next ? 'activated' : 'suspended'}.` });
            this.loadTenants();
          },
          error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Could not update status.' })
        });
      }
    });
  }

  triggerLogoUpload(tenantId: number): void {
    this.pendingLogoTenantId = tenantId;
    const el = document.querySelector<HTMLInputElement>('app-tenant-management input[type="file"]');
    el?.click();
  }

  onLogoSelected(event: any): void {
    const file: File | undefined = event.target?.files?.[0];
    if (!file || !this.pendingLogoTenantId) return;
    if (file.size > 2 * 1024 * 1024) {
      this.msg.add({ severity: 'warn', summary: 'Too Large', detail: 'Max logo size is 2MB.' });
      return;
    }

    const tid = this.pendingLogoTenantId;
    this.tenantService.uploadLogo(tid, file).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Uploaded', detail: 'Pharmacy logo updated.' });
        this.loadTenants();
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Upload Failed', detail: err.error || 'Could not upload logo.' });
      }
    });
  }
}
