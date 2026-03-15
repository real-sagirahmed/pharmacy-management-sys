import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Uom, UomService } from '../../services/uom.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-uom-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, TagModule, DialogModule, ConfirmDialogModule, ToastModule, ToggleSwitchModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="page-wrap animate-fadein-up">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <!-- Sticky Header Area -->
      <div id="main-sticky-zone" class="sticky-header">
        <div class="page-head pt-2 pb-1 px-4">
          <div style="margin-left: 12px;">
            <h1 class="page-title">Unit of Measurement (UOM)</h1>
            <p class="page-sub text-xs">Manage units like Pcs, Box, Strip, Bottle.</p>
          </div>
          <button class="btn-primary" (click)="openAdd()">
            <i class="pi pi-plus"></i>
            <span>Add UOM</span>
          </button>
        </div>

        <!-- ─── Table Toolbar ─── -->
        <div class="table-toolbar px-4 py-2">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input type="text" pInputText [(ngModel)]="searchText" 
                   placeholder="Search by code or name…" 
                   class="search-input">
            <button class="search-clear" *ngIf="searchText" (click)="searchText=''">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="flex items-center gap-4">
            <span class="result-count font-semibold">{{ filteredUoms().length }} results</span>
            <div class="summary-row">
              <div class="chip chip-teal"><i class="pi pi-box"></i> {{ uoms().length }} Total</div>
              <div class="chip chip-green"><i class="pi pi-check-circle"></i> {{ activeCount() }} Active</div>
              <div class="chip chip-slate"><i class="pi pi-times-circle"></i> {{ inactiveCount() }} Inactive</div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4">
        <div class="table-card">
          <!-- Table -->
          <div class="table-responsive">
            <p-table [value]="filteredUoms()" 
                     [paginator]="true" [rows]="10" 
                     [scrollable]="true" scrollHeight="calc(100vh - 230px)"
                     styleClass="p-datatable-sm" [rowHover]="true">
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="code" style="min-width: 100px;">Code <p-sortIcon field="code"></p-sortIcon></th>
                  <th pSortableColumn="name" style="min-width: 150px;">Name <p-sortIcon field="name"></p-sortIcon></th>
                  <th style="min-width: 150px;">Description</th>
                  <th style="min-width: 110px;">Status</th>
                  <th alignFrozen="right" pFrozenColumn style="min-width: 100px;">Actions</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-u>
                <tr>
                  <td><span class="badge badge-slate-light font-mono">{{ u.code }}</span></td>
                  <td><span class="med-name text-sm">{{ u.name }}</span></td>
                  <td><span class="text-muted text-xs">{{ u.description || '—' }}</span></td>
                  <td>
                    <button class="status-toggle-btn"
                            [class.active]="u.isActive"
                            (click)="toggleStatus(u)"
                            [title]="u.isActive ? 'Click to Deactivate' : 'Click to Activate'">
                      <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                      </span>
                      <span class="toggle-label">{{ u.isActive ? 'Active' : 'Inactive' }}</span>
                    </button>
                  </td>
                  <td alignFrozen="right" pFrozenColumn>
                    <div class="action-btns">
                      <button class="act-btn act-edit" title="Edit" (click)="openEdit(u)"><i class="pi pi-pencil"></i></button>
                      <button class="act-btn act-del" title="Delete" (click)="confirmDelete(u)"><i class="pi pi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="5"><div class="empty-state"><i class="pi pi-inbox empty-icon"></i><p class="empty-text">No UOM records found</p></div></td></tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </div>

      <p-dialog [header]="editMode ? 'Edit UOM' : 'Add New UOM'" [(visible)]="showDialog" [modal]="true" [style]="{width:'420px'}" [closable]="true" styleClass="premium-dialog">
        <form [formGroup]="form" class="dialog-form">
          <div class="form-row">
            <div class="form-group">
              <label>Code (Auto-Generated)</label>
              <input pInputText formControlName="code" [readonly]="true" class="field-readonly" placeholder="UOM-AUTO"/>
            </div>
            <div class="form-group">
              <label>Name *</label>
              <input pInputText formControlName="name" placeholder="e.g. Pieces" [class.ng-invalid]="isInvalid('name')"/>
              <small class="err" *ngIf="isInvalid('name')">Name is required</small>
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <input pInputText formControlName="description" placeholder="Optional description"/>
          </div>
        </form>
      <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2 p-2">
            <button class="btn-cancel" (click)="closeDialog()">Cancel</button>
            <button class="btn-save" (click)="save()" [disabled]="form.invalid">
              <i class="pi pi-check"></i> {{ editMode ? 'Update' : 'Save' }}
            </button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .page-wrap { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; height: calc(100vh - 70px); }
    
    /* Sticky & Compact Header */
    .sticky-header {
      position: sticky; top: 0; z-index: 1000;
      background: #ffffff; border-bottom: 2px solid #e2e8f0;
      border-radius: 12px 12px 0 0;
    }
    .page-head { border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .page-title { font-size: 1.15rem !important; margin: 0; font-weight: 800; color: #1e293b; }
    .page-sub { margin: 0; color: #64748b; }
    
    .table-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    
    .btn-primary { display: flex; align-items: center; gap: 8px; background: #0d9488; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: .875rem; font-weight: 600; cursor: pointer; transition: background .15s; font-family: 'Inter', sans-serif; white-space: nowrap; }
    .btn-primary:hover:not(:disabled) { background: #0f766e; } .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .btn-save { display: flex; align-items: center; gap: 8px; background: #0d9488; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: .875rem; font-weight: 600; cursor: pointer; transition: background .15s; font-family: 'Inter', sans-serif; }
    .btn-save:hover:not(:disabled) { background: #0f766e; } .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-cancel { display: flex; align-items: center; gap: 8px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 18px; font-size: .875rem; font-weight: 600; cursor: pointer; transition: all .15s; font-family: 'Inter', sans-serif; }
    .btn-cancel:hover { background: #e2e8f0; }
    
    .summary-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: .8rem; font-weight: 600; }
    .chip-teal { background: #ccfbf1; color: #0f766e; } .chip-green { background: #dcfce7; color: #15803d; } .chip-slate { background: #f1f5f9; color: #475569; }
    
    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0 0 16px 16px; overflow: hidden; display: flex; flex-direction: column; }
    .search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: .875rem; pointer-events: none; }
    .search-input { width: 100%; padding: 9px 36px; height: 34px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px !important; font-family: 'Inter', sans-serif; outline: none; transition: border-color .15s; background: #f8fafc; color: #0f172a; }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: .875rem; }
    .result-count { font-size: .8rem; color: #94a3b8; }
    
    .table-responsive { overflow-x: auto; width: 100%; }
    .med-name { font-weight: 600; color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .badge-slate-light { background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
    
    /* Table Header Styling */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background-color: #f8fafc !important; color: #0d9488 !important; font-weight: 700 !important; font-size: 0.75rem !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; padding: 8px 10px !important; border-bottom: 2px solid #0d9488 !important;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td { padding: 6px 10px !important; border-bottom: 1px solid #f1f5f9; }
    
    /* ─── Status Toggle Switch ─── */
    .status-toggle-btn { display: inline-flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; }
    .toggle-track { position: relative; width: 36px; height: 20px; background: #cbd5e1; border-radius: 99px; transition: background .25s; flex-shrink: 0; }
    .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform .25s; }
    .status-toggle-btn.active .toggle-track { background: #0d9488; }
    .status-toggle-btn.active .toggle-thumb { transform: translateX(16px); }
    .toggle-label { font-size: .72rem; font-weight: 600; color: #64748b; }
    .status-toggle-btn.active .toggle-label { color: #0d9488; }
    
    .action-btns { display: flex; gap: 4px; }
    .act-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .1s; }
    .act-btn:hover { transform: scale(1.1); }
    .act-edit { background: #eff6ff; color: #3b82f6; }
    .act-del  { background: #fff1f2; color: #f43f5e; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; gap: 8px; }
    .empty-icon { font-size: 3rem; color: #cbd5e1; } .empty-text { font-size: 1rem; font-weight: 600; color: #334155; margin: 0; }
    
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: .8rem; font-weight: 600; color: #334155; }
    .form-group input { width: 100%; }
    .field-readonly { background: #f8fafc !important; color: #64748b; font-weight: 500; }
    .err { color: #dc2626; font-size: .75rem; }
    
    ::ng-deep .premium-dialog .p-dialog-header { background: #fff; border-bottom: 1px solid #f1f5f9; padding: 14px 20px; border-radius: 16px 16px 0 0; }
  `]
})
export class UomListComponent implements OnInit {
  uoms = signal<Uom[]>([]);
  searchText = ''; showDialog = false; editMode = false;
  form: FormGroup;
  private editId: number | null = null;

  filteredUoms = computed(() => {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.uoms();
    return this.uoms().filter(u => u.name?.toLowerCase().includes(q) || u.code?.toLowerCase().includes(q));
  });
  activeCount   = computed(() => this.uoms().filter(u => u.isActive).length);
  inactiveCount = computed(() => this.uoms().filter(u => !u.isActive).length);

  constructor(private uomService: UomService, private fb: FormBuilder, private confirmationService: ConfirmationService, private messageService: MessageService) {
    this.form = this.fb.group({ code: ['', [Validators.required, Validators.maxLength(20)]], name: ['', [Validators.required, Validators.maxLength(100)]], description: [''], isActive: [true] });
  }
  ngOnInit() { this.load(); }
  load() { this.uomService.getAll().subscribe({ next: d => this.uoms.set(d), error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load UOMs.' }) }); }
  openAdd() { 
    this.editMode = false; 
    this.editId = null; 
    this.form.reset({ isActive: true }); 
    this.uomService.getNextCode('UOM').subscribe(res => {
      this.form.patchValue({ code: res.code });
    });
    this.showDialog = true; 
  }
  openEdit(u: Uom) { this.editMode = true; this.editId = u.uomId; this.form.patchValue(u); this.showDialog = true; }
  closeDialog() { this.showDialog = false; this.form.reset({ isActive: true }); }
  save() {
    if (this.form.invalid) return;
    const val = { ...this.form.value, uomId: this.editId ?? 0 };
    const obs = this.editMode && this.editId ? this.uomService.update(this.editId, val) : this.uomService.create(val);
    obs.subscribe({
      next: () => { 
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `UOM ${this.editMode ? 'updated' : 'added'}.` }); 
        this.closeDialog(); 
        this.load(); 
      },
      error: (e) => {
        console.error('UOM API Error:', e);
        const detailedError = e.error?.errors ? e.error.errors.join(', ') : (e.error?.message || 'Operation failed.');
        this.messageService.add({ severity: 'error', summary: 'Error', detail: detailedError });
      }
    });
  }

  toggleStatus(u: Uom) {
    this.uomService.update(u.uomId, u).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `${u.name} is now ${u.isActive ? 'Active' : 'Inactive'}.` }),
      error: () => {
        u.isActive = !u.isActive;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status.' });
      }
    });
  }

  confirmDelete(u: Uom) {
    this.confirmationService.confirm({
      message: `Delete UOM "<b>${u.name}</b>"?`, header: 'Confirm Delete', icon: 'pi pi-exclamation-triangle',
      accept: () => this.uomService.delete(u.uomId).subscribe({ next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'UOM deleted.' }); this.load(); }, error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed.' }) })
    });
  }
  isInvalid(f: string): boolean { const c = this.form.get(f); return !!(c && c.invalid && (c.dirty || c.touched)); }
}
