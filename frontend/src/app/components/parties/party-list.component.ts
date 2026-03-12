import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Party, PartyService } from '../../services/party.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-party-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, InputTextModule, TagModule,
    DialogModule, ConfirmDialogModule, ToastModule, SelectModule, ToggleSwitchModule
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="page-wrap animate-fadein-up">

      <!-- Header -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Party Management</h1>
          <p class="page-sub">Manage Customers & Suppliers (Party Master)</p>
        </div>
        <button class="btn-primary" (click)="openAdd()">
          <i class="pi pi-plus"></i> Add Party
        </button>
      </div>

      <!-- Summary Chips -->
      <div class="summary-row">
        <div class="chip chip-teal"><i class="pi pi-users"></i><span>{{ parties().length }} Total</span></div>
        <div class="chip chip-green"><i class="pi pi-check-circle"></i><span>{{ activeCount() }} Active</span></div>
        <div class="chip chip-slate"><i class="pi pi-times-circle"></i><span>{{ inactiveCount() }} Inactive</span></div>
        <div class="chip chip-blue"><i class="pi pi-shopping-cart"></i><span>{{ customerCount() }} Customers</span></div>
        <div class="chip chip-amber"><i class="pi pi-truck"></i><span>{{ supplierCount() }} Suppliers</span></div>
      </div>

      <!-- Table Card -->
      <div class="table-card">
        <div class="table-toolbar">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input class="search-input" type="text" [(ngModel)]="searchText" placeholder="Search by name, code or type…"/>
            <button *ngIf="searchText" class="search-clear" (click)="searchText=''"><i class="pi pi-times"></i></button>
          </div>
          <span class="result-count">{{ filteredParties().length }} results</span>
        </div>

        <p-table [value]="filteredParties()" [paginator]="true" [rows]="10"
                 [responsiveLayout]="'scroll'" styleClass="p-datatable-sm" [rowHover]="true">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="code">Code <p-sortIcon field="code"></p-sortIcon></th>
              <th pSortableColumn="partyType">Type <p-sortIcon field="partyType"></p-sortIcon></th>
              <th pSortableColumn="fullName">Full Name <p-sortIcon field="fullName"></p-sortIcon></th>
              <th>Cell</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td><span class="badge badge-slate">{{ p.code }}</span></td>
              <td><span class="badge" [class.badge-blue]="p.partyType==='Customer'" [class.badge-amber]="p.partyType==='Supplier'">{{ p.partyType }}</span></td>
              <td class="font-semibold">{{ p.fullName }}</td>
              <td class="text-muted">{{ p.cell || '—' }}</td>
              <td class="text-muted">{{ p.email || '—' }}</td>
              <td>
                <p-toggleswitch [(ngModel)]="p.isActive" (onChange)="toggleStatus(p)"></p-toggleswitch>
              </td>
              <td>
                <div class="action-btns">
                  <button class="act-btn act-edit" title="Edit" (click)="openEdit(p)"><i class="pi pi-pencil"></i></button>
                  <button class="act-btn act-del" title="Delete" (click)="confirmDelete(p)"><i class="pi pi-trash"></i></button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7"><div class="empty-state"><i class="pi pi-inbox empty-icon"></i><p class="empty-text">No parties found</p></div></td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Add / Edit Dialog -->
      <p-dialog [header]="editMode ? 'Edit Party' : 'Add New Party'" [(visible)]="showDialog"
                [modal]="true" [style]="{width:'520px'}" [closable]="true">
        <form [formGroup]="form" class="dialog-form">
          <div class="form-row">
            <div class="form-group">
              <label>Code (Auto-Generated)</label>
              <input pInputText formControlName="code" [readonly]="true" class="field-readonly" placeholder="GEN-AUTO"/>
            </div>
            <div class="form-group">
              <label>Party Type *</label>
              <p-select formControlName="partyType" [options]="partyTypes" placeholder="Select Type" 
                        styleClass="w-full" (onChange)="onPartyTypeChange($event.value)"
                        [class.ng-invalid]="isInvalid('partyType')"></p-select>
              <small class="err" *ngIf="isInvalid('partyType')">Party Type is required</small>
            </div>
          </div>
          <div class="form-group">
            <label>Full Name *</label>
            <input pInputText formControlName="fullName" placeholder="Customer or Supplier name" [class.ng-invalid]="isInvalid('fullName')"/>
            <small class="err" *ngIf="isInvalid('fullName')">Full Name is required</small>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Cell</label>
              <input pInputText formControlName="cell" placeholder="01XXXXXXXXX"/>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input pInputText formControlName="email" placeholder="email@example.com" [class.ng-invalid]="isInvalid('email')"/>
              <small class="err" *ngIf="isInvalid('email')">Invalid email format</small>
            </div>
          </div>
          <div class="form-group">
            <label>Address</label>
            <input pInputText formControlName="address" placeholder="Full address"/>
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
    .btn-primary:hover { background: #0f766e; }
    .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }
    .btn-secondary { display: flex; align-items: center; gap: 8px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 18px; font-size: .875rem; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
    .summary-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: .8rem; font-weight: 600; }
    .chip-teal { background: #ccfbf1; color: #0f766e; }
    .chip-green { background: #dcfce7; color: #15803d; }
    .chip-slate { background: #f1f5f9; color: #475569; }
    .chip-blue { background: #dbeafe; color: #1d4ed8; }
    .chip-amber { background: #fef3c7; color: #b45309; }
    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
    .table-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; gap: 12px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: .875rem; pointer-events: none; }
    .search-input { width: 100%; padding: 9px 36px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: .875rem; font-family: 'Inter', sans-serif; outline: none; transition: border-color .15s; background: #f8fafc; color: #0f172a; }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: .875rem; }
    .result-count { font-size: .8rem; color: #94a3b8; white-space: nowrap; }
    .font-semibold { font-weight: 600; }
    .text-muted { color: #64748b; font-size: .875rem; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: .72rem; font-weight: 600; }
    .badge-slate { background: #f1f5f9; color: #475569; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .action-btns { display: flex; gap: 4px; }
    .act-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; transition: background .15s; display: flex; align-items: center; justify-content: center; font-size: .875rem; }
    .act-edit { background: #eff6ff; color: #3b82f6; }
    .act-edit:hover { background: #dbeafe; }
    .act-del { background: #fff1f2; color: #f43f5e; }
    .act-del:hover { background: #ffe4e6; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; gap: 8px; }
    .empty-icon { font-size: 3rem; color: #cbd5e1; }
    .empty-text { font-size: 1rem; font-weight: 600; color: #334155; margin: 0; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: .8rem; font-weight: 600; color: #334155; }
    .form-group input, .form-group ::ng-deep .p-select { width: 100%; }
    .field-readonly { background: #f1f5f9 !important; color: #64748b; font-weight: 700; border-style: dashed !important; }
    .err { color: #dc2626; font-size: .75rem; }
  `]
})
export class PartyListComponent implements OnInit {
  parties = signal<Party[]>([]);
  searchText = '';
  showDialog = false;
  editMode = false;
  form: FormGroup;
  partyTypes = ['Customer', 'Supplier'];
  private editId: number | null = null;

  filteredParties = computed(() => {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.parties();
    return this.parties().filter(p =>
      p.fullName?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.partyType?.toLowerCase().includes(q)
    );
  });
  activeCount   = computed(() => this.parties().filter(p => p.isActive).length);
  inactiveCount = computed(() => this.parties().filter(p => !p.isActive).length);
  customerCount = computed(() => this.parties().filter(p => p.partyType === 'Customer').length);
  supplierCount = computed(() => this.parties().filter(p => p.partyType === 'Supplier').length);

  constructor(
    private partyService: PartyService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      code:      ['', [Validators.required, Validators.maxLength(20)]],
      partyType: ['', Validators.required],
      fullName:  ['', [Validators.required, Validators.maxLength(150)]],
      cell:      [''],
      email:     ['', Validators.email],
      address:   [''],
      isActive:  [true]
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.partyService.getAll().subscribe({
      next: data => this.parties.set(data),
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load parties.' })
    });
  }

  openAdd() { 
    this.editMode = false; 
    this.editId = null; 
    this.form.reset({ partyType: 'Customer', isActive: true }); 
    this.updateNextCode('CUS');
    this.showDialog = true; 
  }

  onPartyTypeChange(type: string) {
    if (this.editMode) return;
    const prefix = type === 'Customer' ? 'CUS' : 'SUP';
    this.updateNextCode(prefix);
  }

  private updateNextCode(prefix: string) {
    this.partyService.getNextCode(prefix).subscribe(res => {
      this.form.patchValue({ code: res.code });
    });
  }

  openEdit(p: Party) {
    this.editMode = true; this.editId = p.partyId;
    this.form.patchValue(p);
    this.showDialog = true;
  }

  closeDialog() { this.showDialog = false; this.form.reset({ partyType: 'Customer', isActive: true }); }

  save() {
    if (this.form.invalid) return;
    const val = { ...this.form.value, partyId: this.editId ?? 0 };
    const obs = this.editMode && this.editId ? this.partyService.update(this.editId, val) : this.partyService.create(val);
    obs.subscribe({
      next: () => { 
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Party ${this.editMode ? 'updated' : 'added'}.` }); 
        this.closeDialog(); 
        this.load(); 
      },
      error: (e) => {
        console.error('Party API Error:', e);
        const detailedError = e.error?.errors ? e.error.errors.join(', ') : (e.error?.message || 'Operation failed.');
        this.messageService.add({ severity: 'error', summary: 'Error', detail: detailedError });
      }
    });
  }

  toggleStatus(p: Party) {
    this.partyService.update(p.partyId, p).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `${p.fullName} is now ${p.isActive ? 'Active' : 'Inactive'}.` }),
      error: () => {
        p.isActive = !p.isActive; // Revert on error
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status.' });
      }
    });
  }

  confirmDelete(p: Party) {
    this.confirmationService.confirm({
      message: `Delete party "<b>${p.fullName}</b>"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.partyService.delete(p.partyId).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Party deleted.' }); this.load(); },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed.' })
        });
      }
    });
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }
}
