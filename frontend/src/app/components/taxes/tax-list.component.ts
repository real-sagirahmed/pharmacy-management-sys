import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Tax, TaxService } from '../../services/tax.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-tax-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, InputTextModule, InputNumberModule,
    TagModule, DialogModule, ConfirmDialogModule, ToastModule, ToggleSwitchModule
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="page-wrap animate-fadein-up">
      <div class="page-head">
        <div>
          <h1 class="page-title">Tax Master</h1>
          <p class="page-sub">Define tax rates for sales and purchases.</p>
        </div>
        <button class="btn-primary" (click)="openAdd()"><i class="pi pi-plus"></i> Add Tax</button>
      </div>

      <div class="summary-row">
        <div class="chip chip-teal"><i class="pi pi-percentage"></i><span>{{ taxes().length }} Total</span></div>
        <div class="chip chip-green"><i class="pi pi-check-circle"></i><span>{{ activeCount() }} Active</span></div>
        <div class="chip chip-slate"><i class="pi pi-times-circle"></i><span>{{ inactiveCount() }} Inactive</span></div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input class="search-input" type="text" [(ngModel)]="searchText" placeholder="Search by code or name…"/>
            <button *ngIf="searchText" class="search-clear" (click)="searchText=''"><i class="pi pi-times"></i></button>
          </div>
          <span class="result-count">{{ filteredTaxes().length }} results</span>
        </div>

        <p-table [value]="filteredTaxes()" [paginator]="true" [rows]="10"
                 [responsiveLayout]="'scroll'" styleClass="p-datatable-sm" [rowHover]="true">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="code">Code <p-sortIcon field="code"></p-sortIcon></th>
              <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
              <th pSortableColumn="taxRate">Tax Rate (%) <p-sortIcon field="taxRate"></p-sortIcon></th>
              <th>Remarks</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-t>
            <tr>
              <td><span class="badge badge-slate">{{ t.code }}</span></td>
              <td class="font-semibold">{{ t.name }}</td>
              <td><span class="rate-badge">{{ t.taxRate }}%</span></td>
              <td class="text-muted">{{ t.remarks || '—' }}</td>
              <td>
                <p-toggleswitch [(ngModel)]="t.isActive" (onChange)="toggleStatus(t)"></p-toggleswitch>
              </td>
              <td>
                <div class="action-btns">
                  <button class="act-btn act-edit" title="Edit" (click)="openEdit(t)"><i class="pi pi-pencil"></i></button>
                  <button class="act-btn act-del" title="Delete" (click)="confirmDelete(t)"><i class="pi pi-trash"></i></button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6"><div class="empty-state"><i class="pi pi-inbox empty-icon"></i><p class="empty-text">No tax records found</p></div></td></tr>
          </ng-template>
        </p-table>
      </div>

      <p-dialog [header]="editMode ? 'Edit Tax' : 'Add New Tax'" [(visible)]="showDialog"
                [modal]="true" [style]="{width:'460px'}" [closable]="true">
        <form [formGroup]="form" class="dialog-form">
          <div class="form-row">
            <div class="form-group">
              <label>Code (Auto-Generated)</label>
              <input pInputText formControlName="code" [readonly]="true" class="field-readonly" placeholder="TAX-AUTO"/>
            </div>
            <div class="form-group">
              <label>Tax Rate (%) *</label>
              <p-inputNumber formControlName="taxRate" [min]="0" [max]="100" [step]="0.5" suffix="%" styleClass="w-full" [class.ng-invalid]="isInvalid('taxRate')"></p-inputNumber>
              <small class="err" *ngIf="isInvalid('taxRate')">Rate must be 0–100</small>
            </div>
          </div>
          <div class="form-group">
            <label>Name *</label>
            <input pInputText formControlName="name" placeholder="e.g. VAT 15%" [class.ng-invalid]="isInvalid('name')"/>
            <small class="err" *ngIf="isInvalid('name')">Name is required</small>
          </div>
          <div class="form-group">
            <label>Remarks</label>
            <input pInputText formControlName="remarks" placeholder="Optional remarks"/>
          </div>
        </form>
        <ng-template pTemplate="footer">
          <button class="btn-secondary" (click)="closeDialog()">Cancel</button>
          <button class="btn-primary" (click)="save()" [disabled]="form.invalid">{{ editMode ? 'Update' : 'Save' }}</button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .page-wrap { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .page-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub { font-size: .875rem; color: #64748b; margin: 0; }
    .btn-primary { display: flex; align-items: center; gap: 8px; background: #0d9488; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: .875rem; font-weight: 600; cursor: pointer; transition: background .15s; font-family: 'Inter', sans-serif; white-space: nowrap; }
    .btn-primary:hover { background: #0f766e; } .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }
    .btn-secondary { display: flex; align-items: center; gap: 8px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 18px; font-size: .875rem; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
    .summary-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: .8rem; font-weight: 600; }
    .chip-teal { background: #ccfbf1; color: #0f766e; } .chip-green { background: #dcfce7; color: #15803d; } .chip-slate { background: #f1f5f9; color: #475569; }
    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
    .table-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; gap: 12px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: .875rem; pointer-events: none; }
    .search-input { width: 100%; padding: 9px 36px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: .875rem; font-family: 'Inter', sans-serif; outline: none; background: #f8fafc; color: #0f172a; }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; }
    .result-count { font-size: .8rem; color: #94a3b8; white-space: nowrap; }
    .font-semibold { font-weight: 600; } .text-muted { color: #64748b; font-size: .875rem; }
    .badge { display: inline-flex; padding: 2px 8px; border-radius: 6px; font-size: .72rem; font-weight: 600; }
    .badge-slate { background: #f1f5f9; color: #475569; }
    .rate-badge { background: #f0fdf4; color: #15803d; padding: 2px 10px; border-radius: 99px; font-size: .8rem; font-weight: 700; }
    .action-btns { display: flex; gap: 4px; }
    .act-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; transition: background .15s; display: flex; align-items: center; justify-content: center; font-size: .875rem; }
    .act-edit { background: #eff6ff; color: #3b82f6; } .act-edit:hover { background: #dbeafe; }
    .act-del { background: #fff1f2; color: #f43f5e; } .act-del:hover { background: #ffe4e6; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; gap: 8px; }
    .empty-icon { font-size: 3rem; color: #cbd5e1; } .empty-text { font-size: 1rem; font-weight: 600; color: #334155; margin: 0; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: .8rem; font-weight: 600; color: #334155; }
    .form-group input, .form-group ::ng-deep .p-inputnumber { width: 100%; }
    .field-readonly { background: #f1f5f9 !important; color: #64748b; font-weight: 700; border-style: dashed !important; }
    .err { color: #dc2626; font-size: .75rem; }
  `]
})
export class TaxListComponent implements OnInit {
  taxes = signal<Tax[]>([]);
  searchText = '';
  showDialog = false;
  editMode = false;
  form: FormGroup;
  private editId: number | null = null;

  filteredTaxes = computed(() => {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.taxes();
    return this.taxes().filter(t => t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q));
  });
  activeCount   = computed(() => this.taxes().filter(t => t.isActive).length);
  inactiveCount = computed(() => this.taxes().filter(t => !t.isActive).length);

  constructor(
    private taxService: TaxService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      code:    ['', [Validators.required, Validators.maxLength(20)]],
      name:    ['', [Validators.required, Validators.maxLength(100)]],
      taxRate: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      remarks: [''],
      isActive: [true]
    });
  }

  ngOnInit() { this.load(); }
  load() {
    this.taxService.getAll().subscribe({
      next: d => this.taxes.set(d),
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load taxes.' })
    });
  }
  openAdd() { 
    this.editMode = false; 
    this.editId = null; 
    this.form.reset({ isActive: true }); 
    this.taxService.getNextCode('TAX').subscribe(res => {
      this.form.patchValue({ code: res.code });
    });
    this.showDialog = true; 
  }
  openEdit(t: Tax) { this.editMode = true; this.editId = t.taxId; this.form.patchValue(t); this.showDialog = true; }
  closeDialog() { this.showDialog = false; this.form.reset({ isActive: true }); }
  save() {
    if (this.form.invalid) return;
    const val = { ...this.form.value, taxId: this.editId ?? 0 };
    const obs = this.editMode && this.editId ? this.taxService.update(this.editId, val) : this.taxService.create(val);
    obs.subscribe({
      next: () => { 
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Tax ${this.editMode ? 'updated' : 'added'}.` }); 
        this.closeDialog(); 
        this.load(); 
      },
      error: (e) => {
        console.error('Tax API Error:', e);
        const detailedError = e.error?.errors ? e.error.errors.join(', ') : (e.error?.message || 'Operation failed.');
        this.messageService.add({ severity: 'error', summary: 'Error', detail: detailedError });
      }
    });
  }

  toggleStatus(t: Tax) {
    this.taxService.update(t.taxId, t).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `${t.name} is now ${t.isActive ? 'Active' : 'Inactive'}.` }),
      error: () => {
        t.isActive = !t.isActive;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status.' });
      }
    });
  }

  confirmDelete(t: Tax) {
    this.confirmationService.confirm({
      message: `Delete tax "<b>${t.name}</b>"?`, header: 'Confirm Delete', icon: 'pi pi-exclamation-triangle',
      accept: () => this.taxService.delete(t.taxId).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Tax deleted.' }); this.load(); },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed.' })
      })
    });
  }
  isInvalid(field: string): boolean { const c = this.form.get(field); return !!(c && c.invalid && (c.dirty || c.touched)); }
}
