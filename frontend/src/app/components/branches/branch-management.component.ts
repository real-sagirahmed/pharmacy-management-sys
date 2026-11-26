import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchService, BranchItem, BranchTransferItem } from '../../services/branch.service';
import { BatchService, MedicineBatchRecord } from '../../services/batch.service';
import { TenantService, TenantListDto } from '../../services/tenant.service';
import { TenantConfigService } from '../../services/tenant-config.service';
import { AuthService } from '../../services/auth.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-branch-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    InputNumberModule, TagModule, DialogModule, SelectModule, TabsModule,
    ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="page-wrap animate-fadein-up" *ngIf="auth.isSystemAdmin() || auth.hasPermission('Branches') || auth.hasPermission('BranchTransfer')">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <div class="sticky-header">
        <div class="page-head pt-2 pb-2 px-4 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 class="page-title">Branches & Inter-Branch Stock Transfers</h1>
            <p class="page-sub text-xs">Manage pharmacy outlets and atomic FEFO stock movements between branches.</p>
          </div>
          <div class="flex items-center gap-2">
            <p-select *ngIf="auth.isSystemAdmin()" [options]="tenants()" optionLabel="pharmacyName" optionValue="tenantId"
                      [(ngModel)]="selectedTenantId" placeholder="All Tenants" [showClear]="true"
                      (onChange)="reloadAll()" styleClass="w-48"></p-select>
            <button *ngIf="canManageBranches()" pButton icon="pi pi-plus" label="New Branch" class="p-button-sm p-button-success"
                    (click)="openCreateBranch()"></button>
            <button *ngIf="canRequestTransfer()" pButton icon="pi pi-arrows-h" label="Request Transfer" class="p-button-sm p-button-outlined"
                    (click)="openTransferDialog()"></button>
          </div>
        </div>

        <div class="px-4 pt-2">
          <p-tabs [value]="activeTab">
            <p-tablist>
              <p-tab [value]="0" (click)="activeTab = 0">Branches ({{ branches().length }})</p-tab>
              <p-tab [value]="1" (click)="activeTab = 1">Stock Transfers ({{ transfers().length }})</p-tab>
            </p-tablist>
          </p-tabs>
        </div>
      </div>

      <div class="px-4 pb-4">
        <div class="table-card" *ngIf="activeTab === 0">
          <p-table [value]="branches()" [loading]="loadingBranches()" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Branch Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Drug License</th>
                <th>Status</th>
                <th class="text-right" *ngIf="canManageBranches()">Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-b>
              <tr>
                <td>
                  <span class="font-bold text-slate-800">{{ b.branchName }}</span>
                  <p-tag *ngIf="b.isHeadOffice" value="Head Office" severity="warn" class="ml-2"></p-tag>
                </td>
                <td>{{ b.phone || '—' }}</td>
                <td class="text-xs text-slate-600">{{ b.address || '—' }}</td>
                <td class="text-xs font-mono">{{ b.drugLicenseNo || '—' }}</td>
                <td><p-tag [value]="b.isActive ? 'Active' : 'Inactive'" [severity]="b.isActive ? 'success' : 'danger'"></p-tag></td>
                <td class="text-right" *ngIf="canManageBranches()">
                  <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm p-button-info" (click)="openEditBranch(b)"></button>
                  <button *ngIf="!b.isHeadOffice || auth.isSystemAdmin()" pButton
                          [icon]="b.isActive ? 'pi pi-lock' : 'pi pi-lock-open'"
                          [class]="b.isActive ? 'p-button-text p-button-sm p-button-danger' : 'p-button-text p-button-sm p-button-success'"
                          (click)="toggleBranchStatus(b)"></button>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        <div class="table-card" *ngIf="activeTab === 1">
          <p-table [value]="transfers()" [loading]="loadingTransfers()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Code</th>
                <th>Date</th>
                <th>Medicine & Batch</th>
                <th>Route</th>
                <th class="text-right">Qty</th>
                <th>Status</th>
                <th>Remarks</th>
                <th class="text-right" *ngIf="canApproveTransfer()">Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-t>
              <tr>
                <td class="font-mono font-bold">{{ t.transferCode }}</td>
                <td class="text-xs">{{ t.transferDate | date:'dd-MMM-yy HH:mm' }}</td>
                <td>
                  <div class="font-semibold">{{ t.medicineName }}</div>
                  <div class="text-xs font-mono text-slate-500">Batch: {{ t.batchNumber }}</div>
                </td>
                <td class="text-xs">
                  <span class="font-semibold">{{ t.fromBranchName || ('#' + t.fromBranchId) }}</span>
                  <i class="pi pi-arrow-right mx-1 text-slate-400"></i>
                  <span class="font-semibold text-teal-700">{{ t.toBranchName || ('#' + t.toBranchId) }}</span>
                </td>
                <td class="text-right font-bold">{{ t.quantity }}</td>
                <td>
                  <p-tag [value]="t.status"
                         [severity]="t.status === 'Completed' ? 'success' : (t.status === 'Rejected' ? 'danger' : 'warn')"></p-tag>
                </td>
                <td class="text-xs text-slate-500">{{ t.remarks || '—' }}</td>
                <td class="text-right" *ngIf="canApproveTransfer()">
                  <div class="flex justify-end gap-1" *ngIf="t.status === 'Pending'">
                    <button pButton label="Approve" icon="pi pi-check" class="p-button-sm p-button-success"
                            (click)="approveTransfer(t)"></button>
                    <button pButton label="Reject" icon="pi pi-times" class="p-button-sm p-button-danger p-button-outlined"
                            (click)="openRejectDialog(t)"></button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>

      <!-- Create / Edit Branch Dialog -->
      <p-dialog [(visible)]="showBranchDialog" [modal]="true" [header]="editingBranch ? 'Edit Branch' : 'New Branch'" [style]="{width: '440px'}">
        <div class="flex flex-col gap-3 pt-2">
          <div class="field" *ngIf="!editingBranch && auth.isSystemAdmin()">
            <label>Tenant *</label>
            <p-select [options]="tenants()" optionLabel="pharmacyName" optionValue="tenantId"
                      [(ngModel)]="branchForm.tenantId" styleClass="w-full"></p-select>
          </div>
          <div class="field">
            <label>Branch Name *</label>
            <input pInputText [(ngModel)]="branchForm.branchName" class="w-full" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input pInputText [(ngModel)]="branchForm.phone" class="w-full" />
          </div>
          <div class="field">
            <label>Address</label>
            <input pInputText [(ngModel)]="branchForm.address" class="w-full" />
          </div>
          <div class="field">
            <label>Drug License No</label>
            <input pInputText [(ngModel)]="branchForm.drugLicenseNo" class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="showBranchDialog = false"></button>
          <button pButton label="Save Branch" class="p-button-success" [loading]="saving" (click)="saveBranch()"></button>
        </ng-template>
      </p-dialog>

      <!-- Request Stock Transfer Dialog -->
      <p-dialog [(visible)]="showTransferDialog" [modal]="true" header="Request Inter-Branch Stock Transfer" [style]="{width: '500px'}">
        <div class="flex flex-col gap-3 pt-2">
          <div class="field">
            <label>From Branch *</label>
            <p-select [options]="activeBranches()" optionLabel="branchName" optionValue="branchId"
                      [(ngModel)]="transferForm.fromBranchId" (onChange)="loadBranchBatches()"
                      [disabled]="isBranchLocked()" styleClass="w-full"></p-select>
          </div>
          <div class="field">
            <label>To Branch *</label>
            <p-select [options]="destinationBranches()" optionLabel="branchName" optionValue="branchId"
                      [(ngModel)]="transferForm.toBranchId" styleClass="w-full"></p-select>
          </div>
          <div class="field">
            <label>Active Source Batch *</label>
            <p-select [options]="sourceBatches()" [(ngModel)]="transferForm.batchId" optionValue="batchId"
                      placeholder="Select batch..." [filter]="true" filterBy="medicineName,batchNumber" styleClass="w-full">
              <ng-template let-item pTemplate="item">
                <div class="text-xs">
                  <b>{{ item.medicineName }}</b> · Batch: {{ item.batchNumber }} · Stock: {{ item.currentStock }}
                </div>
              </ng-template>
              <ng-template let-item pTemplate="selectedItem">
                <div class="text-xs" *ngIf="item">
                  {{ item.medicineName }} · {{ item.batchNumber }} ({{ item.currentStock }} pcs)
                </div>
              </ng-template>
            </p-select>
          </div>
          <div class="field">
            <label>Quantity *</label>
            <p-inputNumber [(ngModel)]="transferForm.quantity" [min]="1" [max]="selectedBatchStock()" styleClass="w-full"></p-inputNumber>
          </div>
          <div class="field">
            <label>Remarks</label>
            <input pInputText [(ngModel)]="transferForm.remarks" class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="showTransferDialog = false"></button>
          <button pButton label="Submit Transfer Request" class="p-button-success" [loading]="saving" (click)="submitTransfer()"></button>
        </ng-template>
      </p-dialog>

      <!-- Reject Transfer Dialog -->
      <p-dialog [(visible)]="showRejectDialog" [modal]="true" header="Reject Stock Transfer" [style]="{width: '400px'}">
        <div class="field pt-2">
          <label>Rejection Reason / Remarks</label>
          <input pInputText [(ngModel)]="rejectRemarks" placeholder="Optional reason..." class="w-full" />
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="showRejectDialog = false"></button>
          <button pButton label="Confirm Reject" class="p-button-danger" [loading]="saving" (click)="confirmReject()"></button>
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
  `]
})
export class BranchManagementComponent implements OnInit {
  branches = signal<BranchItem[]>([]);
  transfers = signal<BranchTransferItem[]>([]);
  tenants = signal<TenantListDto[]>([]);
  sourceBatches = signal<MedicineBatchRecord[]>([]);

  selectedTenantId: number | null = null;
  activeTab = 0;
  loadingBranches = signal(false);
  loadingTransfers = signal(false);
  saving = false;

  showBranchDialog = false;
  editingBranch: BranchItem | null = null;
  branchForm: any = { tenantId: null, branchName: '', phone: '', address: '', drugLicenseNo: '' };

  showTransferDialog = false;
  transferForm: { fromBranchId: number | null; toBranchId: number | null; batchId: number | null; quantity: number; remarks: string } = {
    fromBranchId: null, toBranchId: null, batchId: null, quantity: 1, remarks: ''
  };

  showRejectDialog = false;
  rejectTarget: BranchTransferItem | null = null;
  rejectRemarks = '';

  constructor(
    private branchService: BranchService,
    private batchService: BatchService,
    private tenantService: TenantService,
    private tenantConfig: TenantConfigService,
    public auth: AuthService,
    private msg: MessageService,
    private confirm: ConfirmationService
  ) {}

  ngOnInit(): void {
    if (this.auth.isSystemAdmin()) {
      this.tenantService.getAll().subscribe(t => this.tenants.set(t));
    }
    this.reloadAll();
  }

  canManageBranches(): boolean {
    return this.auth.isAdminOrAbove();
  }

  canRequestTransfer(): boolean {
    return this.auth.isSystemAdmin() || this.auth.hasPermission('BranchTransfer', 'create');
  }

  canApproveTransfer(): boolean {
    return this.auth.isAdminOrAbove();
  }

  isBranchLocked(): boolean {
    return !this.auth.isAdminOrAbove() && !!this.auth.currentUserValue?.branchId;
  }

  activeBranches(): BranchItem[] {
    return this.branches().filter(b => b.isActive);
  }

  destinationBranches(): BranchItem[] {
    return this.activeBranches().filter(b => b.branchId !== this.transferForm.fromBranchId);
  }

  selectedBatchStock(): number {
    const found = this.sourceBatches().find(b => b.batchId === this.transferForm.batchId);
    return found?.currentStock || 999999;
  }

  reloadAll(): void {
    this.loadingBranches.set(true);
    this.branchService.getBranches(this.selectedTenantId).subscribe({
      next: res => { this.branches.set(res); this.loadingBranches.set(false); },
      error: () => this.loadingBranches.set(false)
    });

    this.loadingTransfers.set(true);
    this.branchService.getTransfers(this.selectedTenantId).subscribe({
      next: res => { this.transfers.set(res); this.loadingTransfers.set(false); },
      error: () => this.loadingTransfers.set(false)
    });
  }

  openCreateBranch(): void {
    this.editingBranch = null;
    this.branchForm = {
      tenantId: this.selectedTenantId || (this.tenants()[0]?.tenantId ?? null),
      branchName: '',
      phone: '',
      address: '',
      drugLicenseNo: ''
    };
    this.showBranchDialog = true;
  }

  openEditBranch(b: BranchItem): void {
    this.editingBranch = b;
    this.branchForm = {
      tenantId: b.tenantId,
      branchName: b.branchName,
      phone: b.phone || '',
      address: b.address || '',
      drugLicenseNo: b.drugLicenseNo || ''
    };
    this.showBranchDialog = true;
  }

  saveBranch(): void {
    if (!this.branchForm.branchName?.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Branch name is required.' });
      return;
    }

    this.saving = true;
    const obs = this.editingBranch
      ? this.branchService.updateBranch(this.editingBranch.branchId, this.branchForm)
      : this.branchService.createBranch(this.branchForm);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showBranchDialog = false;
        this.msg.add({ severity: 'success', summary: 'Saved', detail: 'Branch saved cleanly.' });
        this.reloadAll();
        this.tenantConfig.loadConfig().subscribe();
      },
      error: (err) => {
        this.saving = false;
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || err.error || 'Could not save branch.' });
      }
    });
  }

  toggleBranchStatus(b: BranchItem): void {
    const next = !b.isActive;
    this.branchService.setStatus(b.branchId, next).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Updated', detail: `Branch ${next ? 'activated' : 'deactivated'}.` });
        this.reloadAll();
        this.tenantConfig.loadConfig().subscribe();
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Blocked', detail: err.error || 'Cannot update branch status.' });
      }
    });
  }

  openTransferDialog(): void {
    const userBranchId = this.auth.currentUserValue?.branchId || null;
    const actives = this.activeBranches();
    const defaultFrom = userBranchId || actives[0]?.branchId || null;
    this.transferForm = { fromBranchId: defaultFrom, toBranchId: null, batchId: null, quantity: 1, remarks: '' };
    this.showTransferDialog = true;
    this.loadBranchBatches();
  }

  loadBranchBatches(): void {
    if (!this.transferForm.fromBranchId) {
      this.sourceBatches.set([]);
      return;
    }
    this.batchService.getBatches({ branchId: this.transferForm.fromBranchId, status: 'Active' }).subscribe({
      next: rows => this.sourceBatches.set(rows),
      error: () => this.sourceBatches.set([])
    });
  }

  submitTransfer(): void {
    if (!this.transferForm.fromBranchId || !this.transferForm.toBranchId || !this.transferForm.batchId || this.transferForm.quantity < 1) {
      this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Select branches, batch and positive quantity.' });
      return;
    }
    this.saving = true;
    this.branchService.requestTransfer({
      fromBranchId: this.transferForm.fromBranchId,
      toBranchId: this.transferForm.toBranchId,
      batchId: this.transferForm.batchId,
      quantity: this.transferForm.quantity,
      remarks: this.transferForm.remarks
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showTransferDialog = false;
        this.msg.add({ severity: 'success', summary: 'Submitted', detail: 'Stock transfer request created.' });
        this.activeTab = 1;
        this.reloadAll();
      },
      error: (err) => {
        this.saving = false;
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || err.error || 'Transfer request failed.' });
      }
    });
  }

  approveTransfer(t: BranchTransferItem): void {
    this.confirm.confirm({
      message: `Approve transfer <b>${t.transferCode}</b> (${t.quantity} pcs of ${t.medicineName})?`,
      header: 'Confirm Stock Transfer Approval',
      accept: () => {
        this.branchService.approveTransfer(t.transferId).subscribe({
          next: () => {
            this.msg.add({ severity: 'success', summary: 'Approved', detail: 'Stock transferred atomically.' });
            this.reloadAll();
          },
          error: (err) => {
            this.msg.add({ severity: 'error', summary: 'Error', detail: err.error || 'Approval failed.' });
          }
        });
      }
    });
  }

  openRejectDialog(t: BranchTransferItem): void {
    this.rejectTarget = t;
    this.rejectRemarks = '';
    this.showRejectDialog = true;
  }

  confirmReject(): void {
    if (!this.rejectTarget) return;
    this.saving = true;
    this.branchService.rejectTransfer(this.rejectTarget.transferId, this.rejectRemarks).subscribe({
      next: () => {
        this.saving = false;
        this.showRejectDialog = false;
        this.msg.add({ severity: 'info', summary: 'Rejected', detail: 'Transfer request rejected.' });
        this.reloadAll();
      },
      error: (err) => {
        this.saving = false;
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error || 'Rejection failed.' });
      }
    });
  }
}
