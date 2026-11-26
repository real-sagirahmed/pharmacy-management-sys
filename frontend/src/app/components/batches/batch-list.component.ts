import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BatchService, MedicineBatchRecord } from '../../services/batch.service';
import { AuthService } from '../../services/auth.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    SelectModule, TagModule, ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="page-wrap animate-fadein-up" *ngIf="auth.isSystemAdmin() || auth.hasPermission('Batches')">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <div class="sticky-header">
        <div class="page-head pt-2 pb-2 px-4 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 class="page-title">Batch Control, Quarantine & Recalls</h1>
            <p class="page-sub text-xs">Branch-scoped FEFO medicine batches. Only Admins can recall, quarantine or reactivate batches.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText [(ngModel)]="searchText" placeholder="Medicine or batch..." class="p-inputtext-sm" (keyup.enter)="loadBatches()" />
            </span>
            <p-select [options]="statusOptions" [(ngModel)]="statusFilter" placeholder="All Statuses" [showClear]="true"
                      (onChange)="loadBatches()" styleClass="w-40"></p-select>
            <button pButton icon="pi pi-refresh" label="Filter" class="p-button-sm p-button-outlined" (click)="loadBatches()"></button>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4">
        <div class="table-card">
          <p-table [value]="batches()" [loading]="loading()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Medicine</th>
                <th>Branch</th>
                <th>Batch #</th>
                <th>Expiry Date</th>
                <th class="text-right">Stock</th>
                <th>Status</th>
                <th class="text-right" *ngIf="auth.isAdminOrAbove()">Compliance Action</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-b>
              <tr>
                <td>
                  <div class="font-bold text-slate-800">{{ b.medicineName }}</div>
                  <div class="text-xs font-mono text-slate-500">{{ b.medicineCode }}</div>
                </td>
                <td class="text-xs">{{ b.branchName || ('Branch #' + b.branchId) }}</td>
                <td class="font-mono font-bold">{{ b.batchNumber }}</td>
                <td>
                  <span [class.text-red-600]="b.isExpired" [class.font-bold]="b.isExpired || b.isNearExpiry">
                    {{ b.expiryDate | date:'dd-MMM-yyyy' }}
                  </span>
                  <p-tag *ngIf="b.isExpired" value="Expired" severity="danger" class="ml-1"></p-tag>
                  <p-tag *ngIf="!b.isExpired && b.isNearExpiry" value="Near Expiry" severity="warn" class="ml-1"></p-tag>
                </td>
                <td class="text-right font-bold">{{ b.currentStock }}</td>
                <td>
                  <p-tag [value]="b.status"
                         [severity]="b.status === 'Active' ? 'success' : (b.status === 'Quarantined' ? 'warn' : 'danger')"></p-tag>
                </td>
                <td class="text-right" *ngIf="auth.isAdminOrAbove()">
                  <div class="flex justify-end gap-1">
                    <button *ngIf="b.status !== 'Quarantined'" pButton label="Quarantine" icon="pi pi-pause-circle"
                            class="p-button-sm p-button-warning p-button-outlined"
                            (click)="changeStatus(b, 'Quarantined')"></button>
                    <button *ngIf="b.status !== 'Recalled'" pButton label="Recall" icon="pi pi-exclamation-triangle"
                            class="p-button-sm p-button-danger p-button-outlined"
                            (click)="changeStatus(b, 'Recalled')"></button>
                    <button *ngIf="b.status !== 'Active'" pButton label="Activate" icon="pi pi-check-circle"
                            class="p-button-sm p-button-success p-button-outlined"
                            (click)="changeStatus(b, 'Active')"></button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; }
    .sticky-header { background: #fff; border-bottom: 2px solid #e2e8f0; border-radius: 12px 12px 0 0; }
    .page-title { font-size: 1.15rem; font-weight: 800; margin: 0; color: #1e293b; }
    .page-sub { margin: 0; color: #475569; }
    .table-card { background: #fff; border-radius: 12px; padding: 0.75rem; border: 1px solid #e2e8f0; }
  `]
})
export class BatchListComponent implements OnInit {
  batches = signal<MedicineBatchRecord[]>([]);
  loading = signal(false);
  searchText = '';
  statusFilter: string | null = null;
  statusOptions = ['Active', 'Quarantined', 'Recalled'];

  constructor(
    private batchService: BatchService,
    public auth: AuthService,
    private msg: MessageService,
    private confirm: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.loading.set(true);
    this.batchService.getBatches({
      search: this.searchText || undefined,
      status: this.statusFilter || undefined
    }).subscribe({
      next: rows => { this.batches.set(rows); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  changeStatus(b: MedicineBatchRecord, status: 'Active' | 'Recalled' | 'Quarantined'): void {
    this.confirm.confirm({
      message: `Mark batch <b>${b.batchNumber}</b> (${b.medicineName}) as <b>${status}</b>?`,
      header: 'Confirm Batch Status',
      accept: () => {
        this.batchService.updateStatus(b.batchId, status).subscribe({
          next: () => {
            this.msg.add({ severity: 'success', summary: 'Updated', detail: `Batch marked ${status}.` });
            this.loadBatches();
          },
          error: (err) => {
            this.msg.add({ severity: 'error', summary: 'Blocked', detail: err.error?.message || 'Status update failed.' });
          }
        });
      }
    });
  }
}
