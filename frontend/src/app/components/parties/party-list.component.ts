import { Component, OnInit, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
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
    <div class="page-wrap animate-fadein-up">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <!-- Sticky Header Area -->
      <div id="main-sticky-zone" class="sticky-header">
        <div class="page-head pt-2 pb-1 px-4">
          <div style="margin-left: 12px;">
            <h1 class="page-title">Party Management</h1>
            <p class="page-sub text-xs">Manage Customers & Suppliers (Party Master)</p>
          </div>
          <button class="btn-primary" (click)="openAdd()" title="Shortcut: Alt + N">
            <i class="pi pi-plus"></i>
            <span>Add New Party</span>
          </button>
        </div>

        <!-- ─── Table Toolbar ─── -->
        <div class="table-toolbar px-4 py-2">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input #searchInput type="text" pInputText [(ngModel)]="searchText" 
                   placeholder="Search by name, code or type... (Shortcut: /)" 
                   class="search-input">
            <button class="search-clear" *ngIf="searchText" (click)="searchText=''">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="flex items-center gap-4">
            <span class="result-count font-semibold">{{ filteredParties().length }} items found</span>
            <div class="summary-row">
              <div class="chip chip-teal"><i class="pi pi-users"></i> {{ parties().length }} Total</div>
              <div class="chip chip-blue"><i class="pi pi-user"></i> {{ customerCount() }} Customers</div>
              <div class="chip chip-amber"><i class="pi pi-truck"></i> {{ supplierCount() }} Suppliers</div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4">
        <div class="table-card">
          <!-- Table -->
          <div class="table-responsive">
            <p-table [value]="filteredParties()" 
                     [paginator]="true" [rows]="pageSize" 
                     [scrollable]="true" scrollHeight="calc(100vh - 230px)"
                     styleClass="p-datatable-sm" [rowHover]="true"
                     emptyMessage="No parties found.">
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="code" style="min-width: 100px;">Code <p-sortIcon field="code"></p-sortIcon></th>
                  <th pSortableColumn="partyType" style="min-width: 120px;">Type <p-sortIcon field="partyType"></p-sortIcon></th>
                  <th pSortableColumn="fullName" style="min-width: 200px;">Full Name <p-sortIcon field="fullName"></p-sortIcon></th>
                  <th style="min-width: 150px;">Contact Phone</th>
                  <th style="min-width: 150px;">Email</th>
                  <th style="min-width: 110px;">Status</th>
                  <th alignFrozen="right" pFrozenColumn style="min-width: 120px;">Actions</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-p>
                <tr>
                  <td><span class="med-code-badge">{{ p.code }}</span></td>
                  <td>
                    <span class="badge" 
                          [class.badge-blue]="p.partyType === 'Customer'" 
                          [class.badge-amber]="p.partyType === 'Supplier'">
                      {{ p.partyType }}
                    </span>
                  </td>
                  <td><span class="med-name text-sm">{{ p.fullName }}</span></td>
                  <td><span class="text-sm font-medium">{{ p.cell || '-' }}</span></td>
                  <td><span class="text-muted text-xs">{{ p.email || '-' }}</span></td>
                  <td>
                    <button class="status-toggle-btn"
                            [class.active]="p.isActive"
                            (click)="toggleStatus(p)"
                            [title]="p.isActive ? 'Click to Deactivate' : 'Click to Activate'">
                      <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                      </span>
                      <span class="toggle-label">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
                    </button>
                  </td>
                  <td alignFrozen="right" pFrozenColumn>
                    <div class="action-btns">
                      <button class="act-btn act-edit" title="Edit" (click)="openEdit(p)"><i class="pi pi-pencil"></i></button>
                      <button class="act-btn act-del" title="Delete" (click)="confirmDelete(p)"><i class="pi pi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </div>

      <!-- Add / Edit Dialog -->
      <p-dialog [(visible)]="showDialog" [modal]="true"
                [style]="{width:'95vw', maxWidth:'550px'}" 
                [closable]="true" [draggable]="false" [resizable]="false"
                styleClass="premium-dialog">
        
        <ng-template pTemplate="header">
          <div class="dialog-header-custom">
            <div class="header-icon-hex">
              <i class="pi" [class.pi-plus]="!editMode" [class.pi-pencil]="editMode"></i>
            </div>
            <div>
              <h2 class="dialog-title-text">{{ editMode ? 'Edit Party' : 'Add New Party' }}</h2>
              <p class="dialog-sub-text">Enter the details for the customer or supplier below.</p>
            </div>
          </div>
        </ng-template>

        <form [formGroup]="form" class="med-form-premium">
          <div class="form-scroll-area">
            
            <!-- ─── Section 1: Basic Identity ─── -->
            <div class="form-section">
              <span class="section-tag"><i class="pi pi-tag"></i> Primary Identity</span>
              <div class="grid-form-premium">
                <div class="form-field-premium">
                  <label class="field-label-premium">Party Type <span class="required">*</span></label>
                  <p-select formControlName="partyType" [options]="partyTypes" placeholder="Select Type" 
                            styleClass="w-full premium-select" (onChange)="onPartyTypeChange($event.value)"
                            [class.ng-invalid]="isInvalid('partyType')"></p-select>
                  <small class="error-text" *ngIf="isInvalid('partyType')">Type is required</small>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">System Code</label>
                  <input pInputText formControlName="code" [readonly]="true" class="premium-input readonly-input" placeholder="GEN-AUTO"/>
                  <small class="info-text">Generated automatically.</small>
                </div>

                <div class="form-field-premium full">
                  <label class="field-label-premium">Full Name / Business Name <span class="required">*</span></label>
                  <input pInputText formControlName="fullName" class="premium-input" placeholder="e.g. Acme Corp or John Doe" [class.ng-invalid]="isInvalid('fullName')"/>
                  <small class="error-text" *ngIf="isInvalid('fullName')">Full Name is required</small>
                </div>
              </div>
            </div>

            <!-- ─── Section 2: Contact Info ─── -->
            <div class="form-section no-border">
              <div class="section-tag"><i class="pi pi-phone"></i> Contact Information</div>
              <div class="grid-form-premium">
                <div class="form-field-premium">
                  <label class="field-label-premium">Mobile/Cell No.</label>
                  <input pInputText formControlName="cell" class="premium-input" placeholder="01XXXXXXXXX"/>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">Email Address</label>
                  <input pInputText formControlName="email" class="premium-input" placeholder="email@example.com" [class.ng-invalid]="isInvalid('email')"/>
                  <small class="error-text" *ngIf="isInvalid('email')">Invalid email format</small>
                </div>

                <div class="form-field-premium full">
                  <label class="field-label-premium">Address</label>
                  <input pInputText formControlName="address" class="premium-input" placeholder="Full business or home address"/>
                </div>

                <div class="form-field-premium status-field">
                  <label class="field-label-premium">Account Status</label>
                  <div class="status-toggle-wrap">
                    <span [class.active-txt]="form.get('isActive')?.value">
                      {{ form.get('isActive')?.value ? 'Active' : 'Inactive' }}
                    </span>
                    <label class="premium-switch">
                      <input type="checkbox" formControlName="isActive">
                      <span class="slider-premium round"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>

        <ng-template pTemplate="footer">
          <div class="premium-dialog-footer">
            <button class="btn-cancel" (click)="closeDialog()">
              <i class="pi pi-times"></i> Cancel
            </button>
            <button class="btn-save" (click)="save()" [disabled]="form.invalid">
              <i class="pi pi-check-circle"></i>
              <span>{{ editMode ? 'Update' : 'Save' }} Party</span>
            </button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .page-wrap { display: flex; flex-direction: column; width: 100%; }
    
    /* Sticky Header Area */
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #ffffff;
      border-bottom: 2px solid #e2e8f0;
    }
    .page-head { border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .page-title { font-size: 1.15rem !important; margin: 0; font-weight: 800; color: #1e293b; }
    .page-sub { margin: 0; color: #64748b; font-size: 0.75rem; }
    
    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: #0d9488; color: #fff;
      border: none; border-radius: 10px;
      padding: 10px 18px;
      font-size: .875rem; font-weight: 600;
      cursor: pointer; transition: background .15s;
      font-family: 'Inter', sans-serif;
      white-space: nowrap;
    }
    .btn-primary:hover:not(:disabled) { background: #0f766e; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .table-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; gap: 12px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: .875rem; pointer-events: none; }
    .search-input { width: 100%; padding: 9px 36px; height: 34px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px !important; font-family: 'Inter', sans-serif; outline: none; transition: border-color .15s; background: #f8fafc; color: #0f172a; }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: .875rem; }
    .result-count { font-size: .8rem; color: #94a3b8; }

    .summary-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: .8rem; font-weight: 600; }
    .chip-teal   { background: #ccfbf1; color: #0f766e; }
    .chip-blue   { background: #dbeafe; color: #1d4ed8; }
    .chip-amber  { background: #fef3c7; color: #b45309; }

    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
    .table-responsive { overflow-x: auto; width: 100%; }

    /* Table Header Styling */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background-color: #f8fafc !important;
      color: #0d9488 !important;
      font-weight: 700 !important;
      font-size: 0.75rem !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      padding: 8px 10px !important;
      border-bottom: 2px solid #0d9488 !important;
    }
    
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 6px 10px !important;
      border-bottom: 1px solid #f1f5f9;
    }

    .med-code-badge { font-family: monospace; background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 6px; font-size: .75rem; font-weight: 700; }
    .med-name { font-weight: 600; color: #0f172a; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: .72rem; font-weight: 600; }
    .badge-blue { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
    .badge-amber { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }

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

    /* ─── Premium Dialog & Form ─── */
    ::ng-deep .premium-dialog .p-dialog-header { background: #fff; border-bottom: 1px solid #f1f5f9; padding: 14px 20px; border-radius: 16px 16px 0 0; }
    ::ng-deep .premium-dialog .p-dialog-content { padding: 0 !important; border-radius: 0 0 16px 16px; overflow-y: visible; }
    
    ::ng-deep .dialog-header-custom { display: flex; align-items: center; gap: 12px; }
    ::ng-deep .header-icon-hex {
      width: 36px; height: 36px; background: #0d9488; color: #fff;
      display: flex; align-items: center; justify-content: center;
      border-radius: 10px; font-size: 1rem;
      box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);
      flex-shrink: 0;
    }
    ::ng-deep .dialog-title-text { font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; }
    ::ng-deep .dialog-sub-text { font-size: .7rem; color: #64748b; margin: 0; }

    ::ng-deep .med-form-premium { background: #fff; width: 100%; }
    ::ng-deep .form-scroll-area { 
      max-height: 60vh; overflow-y: auto; padding: 18px 24px; 
      display: flex; flex-direction: column; gap: 18px; 
    }

    ::ng-deep .form-section { display: flex; flex-direction: column; gap: 12px; padding-bottom: 18px; border-bottom: 1px dashed #e2e8f0; }
    ::ng-deep .form-section.no-border { border-bottom: none; padding-bottom: 0; }
    ::ng-deep .section-tag { font-size: .6rem; font-weight: 700; color: #94a3b8; letter-spacing: .1em; display: flex; align-items: center; gap: 6px; }

    ::ng-deep .grid-form-premium { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 550px) { ::ng-deep .grid-form-premium { grid-template-columns: 1fr; gap: 12px; } }
    
    ::ng-deep .form-field-premium { display: flex; flex-direction: column; gap: 6px; width: 100%; }
    ::ng-deep .form-field-premium.full { grid-column: 1 / -1; }
    
    ::ng-deep .field-label-premium { font-size: .75rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 6px; margin-bottom: 0; }
    ::ng-deep .required { color: #f43f5e; }

    ::ng-deep .premium-input, ::ng-deep .readonly-input {
      padding: 8px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
      font-size: .8rem; font-family: 'Inter', sans-serif; transition: all .2s; outline: none;
      width: 100%; box-sizing: border-box;
    }
    ::ng-deep .premium-input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1); background: #fff; }
    ::ng-deep .readonly-input { background: #f8fafc; color: #64748b; cursor: not-allowed; }
    
    ::ng-deep .premium-select { border-radius: 10px; font-size: .8rem; }
    ::ng-deep .premium-select .p-select-label { padding: 8px 12px; }

    ::ng-deep .info-text { font-size: .65rem; color: #94a3b8; font-style: italic; margin-top: 1px; }
    ::ng-deep .error-text { color: #f43f5e; font-size: .68rem; font-weight: 500; margin-top: 1px; }

    ::ng-deep .status-field { display: flex; flex-direction: row; align-items: center; justify-content: space-between; margin-top: 4px; }
    ::ng-deep .status-toggle-wrap { display: flex; align-items: center; gap: 10px; font-size: .8rem; font-weight: 600; color: #94a3b8; }
    ::ng-deep .active-txt { color: #0d9488; }

    /* Custom Toggle */
    ::ng-deep .premium-switch { position: relative; display: inline-block; width: 38px; height: 20px; }
    ::ng-deep .premium-switch input { opacity: 0; width: 0; height: 0; }
    ::ng-deep .slider-premium {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background-color: #e2e8f0; transition: .3s; border-radius: 20px;
    }
    ::ng-deep .slider-premium:before {
      position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px;
      background-color: white; transition: .3s; border-radius: 50%;
    }
    ::ng-deep input:checked + .slider-premium { background-color: #0d9488; }
    ::ng-deep input:checked + .slider-premium:before { transform: translateX(18px); }

    .animate-fadein-up { animation: fadeIn .5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* Footer Buttons */
    ::ng-deep .premium-dialog-footer { display: flex; justify-content: flex-end; gap: 10px; width: 100%; padding: 12px 24px; border-top: 1px solid #f1f5f9; }
    ::ng-deep .btn-cancel {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;
      border-radius: 10px; font-weight: 600; font-size: .8rem; cursor: pointer; transition: all .2s;
    }
    ::ng-deep .btn-cancel:hover { background: #e2e8f0; color: #0f172a; }
    
    ::ng-deep .btn-save {
      display: flex; align-items: center; gap: 8px; padding: 8px 20px;
      background: linear-gradient(135deg, #0d9488, #0f766e); color: #fff;
      border: none; border-radius: 10px; font-weight: 700; font-size: .8rem;
      cursor: pointer; transition: all .2s; box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);
    }
    ::ng-deep .btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(13, 148, 136, 0.25); opacity: 0.95; }
    ::ng-deep .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

    ::ng-deep .p-dialog-mask { 
      background-color: rgba(15, 23, 42, 0.6) !important; 
      backdrop-filter: blur(4px); 
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
  `]

})
export class PartyListComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;

  parties = signal<Party[]>([]);
  searchText = '';
  pageSize = 10;
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

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.altKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      this.openAdd();
    }
    if (event.key === 'Escape') {
      if (this.showDialog) this.closeDialog();
      else if (this.searchText) this.searchText = '';
    }
    if (event.key === '/' && !this.showDialog) {
      const activeElement = document.activeElement;
      if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault();
        this.searchInput.nativeElement.focus();
      }
    }
  }

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
