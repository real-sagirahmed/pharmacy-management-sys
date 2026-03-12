import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Category, CategoryService } from '../../services/category.service';
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
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, TagModule, DialogModule, ConfirmDialogModule, ToastModule, ToggleSwitchModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
    <div class="page-wrap animate-fadein-up">
      <div class="page-head">
        <div><h1 class="page-title">Category Master</h1><p class="page-sub">Medicine categories like Antibiotic, Antacid, Vitamin.</p></div>
        <button class="btn-primary" (click)="openAdd()"><i class="pi pi-plus"></i> Add Category</button>
      </div>
      <div class="summary-row">
        <div class="chip chip-teal"><i class="pi pi-tags"></i><span>{{ categories().length }} Total</span></div>
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
          <span class="result-count">{{ filteredCategories().length }} results</span>
        </div>
        <p-table [value]="filteredCategories()" [paginator]="true" [rows]="10" [responsiveLayout]="'scroll'" styleClass="p-datatable-sm" [rowHover]="true">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="code">Code <p-sortIcon field="code"></p-sortIcon></th>
              <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td><span class="badge badge-slate">{{ c.code }}</span></td>
              <td class="font-semibold">{{ c.name }}</td>
              <td class="text-muted">{{ c.description || '—' }}</td>
              <td>
                <p-toggleswitch [(ngModel)]="c.isActive" (onChange)="toggleStatus(c)"></p-toggleswitch>
              </td>
              <td>
                <div class="action-btns">
                  <button class="act-btn act-edit" title="Edit" (click)="openEdit(c)"><i class="pi pi-pencil"></i></button>
                  <button class="act-btn act-del" title="Delete" (click)="confirmDelete(c)"><i class="pi pi-trash"></i></button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5"><div class="empty-state"><i class="pi pi-inbox empty-icon"></i><p class="empty-text">No categories found</p></div></td></tr>
          </ng-template>
        </p-table>
      </div>
      <p-dialog [header]="editMode ? 'Edit Category' : 'Add New Category'" [(visible)]="showDialog" [modal]="true" [style]="{width:'420px'}" [closable]="true">
        <form [formGroup]="form" class="dialog-form">
          <div class="form-row">
            <div class="form-group">
              <label>Code (Auto-Generated)</label>
              <input pInputText formControlName="code" [readonly]="true" class="field-readonly" placeholder="CAT-AUTO"/>
            </div>
            <div class="form-group">
              <label>Name *</label>
              <input pInputText formControlName="name" placeholder="e.g. Antibiotic" [class.ng-invalid]="isInvalid('name')"/>
              <small class="err" *ngIf="isInvalid('name')">Name is required</small>
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <input pInputText formControlName="description" placeholder="Optional description"/>
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
    :host { display:block; width:100%; }
    .page-wrap { display:flex; flex-direction:column; gap:20px; }
    .page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .page-title { font-size:1.5rem; font-weight:800; color:#0f172a; margin:0 0 4px; }
    .page-sub { font-size:.875rem; color:#64748b; margin:0; }
    .btn-primary { display:flex; align-items:center; gap:8px; background:#0d9488; color:#fff; border:none; border-radius:10px; padding:10px 18px; font-size:.875rem; font-weight:600; cursor:pointer; }
    .btn-primary:hover { background:#0f766e; } .btn-primary:disabled { background:#94a3b8; cursor:not-allowed; }
    .btn-secondary { background:#f1f5f9; color:#334155; border:1px solid #e2e8f0; border-radius:10px; padding:10px 18px; font-size:.875rem; font-weight:600; cursor:pointer; }
    .summary-row { display:flex; gap:10px; flex-wrap:wrap; }
    .chip { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:99px; font-size:.8rem; font-weight:600; }
    .chip-teal { background:#ccfbf1; color:#0f766e; } .chip-green { background:#dcfce7; color:#15803d; } .chip-slate { background:#f1f5f9; color:#475569; }
    .table-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; }
    .table-toolbar { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #f1f5f9; gap:12px; }
    .search-wrap { position:relative; display:flex; align-items:center; flex:1; max-width:400px; }
    .search-icon { position:absolute; left:12px; color:#94a3b8; pointer-events:none; }
    .search-input { width:100%; padding:9px 36px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:.875rem; outline:none; background:#f8fafc; }
    .search-input:focus { border-color:#0d9488; }
    .search-clear { position:absolute; right:10px; background:none; border:none; color:#94a3b8; cursor:pointer; }
    .result-count { font-size:.8rem; color:#94a3b8; }
    .font-semibold { font-weight:600; } .text-muted { color:#64748b; font-size:.875rem; }
    .badge { display:inline-flex; padding:2px 8px; border-radius:6px; font-size:.72rem; font-weight:600; }
    .badge-slate { background:#f1f5f9; color:#475569; }
    .action-btns { display:flex; gap:4px; }
    .act-btn { width:32px; height:32px; border:none; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
    .act-edit { background:#eff6ff; color:#3b82f6; } .act-edit:hover { background:#dbeafe; }
    .act-del { background:#fff1f2; color:#f43f5e; } .act-del:hover { background:#ffe4e6; }
    .empty-state { display:flex; flex-direction:column; align-items:center; padding:48px 20px; gap:8px; }
    .empty-icon { font-size:3rem; color:#cbd5e1; } .empty-text { font-size:1rem; font-weight:600; color:#334155; margin:0; }
    .dialog-form { display:flex; flex-direction:column; gap:14px; padding:4px 0; }
    .form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .form-group { display:flex; flex-direction:column; gap:6px; }
    .form-group label { font-size:.8rem; font-weight:600; color:#334155; }
    .form-group input { width:100%; }
    .field-readonly { background: #f1f5f9 !important; color: #64748b; font-weight: 700; border-style: dashed !important; }
    .err { color:#dc2626; font-size:.75rem; }
  `]
})
export class CategoryListComponent implements OnInit {
  categories = signal<Category[]>([]);
  searchText = ''; showDialog = false; editMode = false;
  form: FormGroup;
  private editId: number | null = null;

  filteredCategories = computed(() => {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.categories();
    return this.categories().filter(c => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q));
  });
  activeCount   = computed(() => this.categories().filter(c => c.isActive).length);
  inactiveCount = computed(() => this.categories().filter(c => !c.isActive).length);

  constructor(private categoryService: CategoryService, private fb: FormBuilder, private confirmationService: ConfirmationService, private messageService: MessageService) {
    this.form = this.fb.group({ code: ['', [Validators.required, Validators.maxLength(20)]], name: ['', [Validators.required, Validators.maxLength(100)]], description: [''], isActive: [true] });
  }
  ngOnInit() { this.load(); }
  load() { this.categoryService.getAll().subscribe({ next: d => this.categories.set(d), error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load.' }) }); }
  openAdd() { 
    this.editMode = false; 
    this.editId = null; 
    this.form.reset({ isActive: true }); 
    this.categoryService.getNextCode('CAT').subscribe(res => {
      this.form.patchValue({ code: res.code });
    });
    this.showDialog = true; 
  }
  openEdit(c: Category) { this.editMode = true; this.editId = c.categoryId; this.form.patchValue(c); this.showDialog = true; }
  closeDialog() { this.showDialog = false; this.form.reset({ isActive: true }); }
  save() {
    if (this.form.invalid) return;
    const val = { ...this.form.value, categoryId: this.editId ?? 0 };
    const obs = this.editMode && this.editId ? this.categoryService.update(this.editId, val) : this.categoryService.create(val);
    obs.subscribe({
      next: () => { 
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Category ${this.editMode ? 'updated' : 'added'}.` }); 
        this.closeDialog(); 
        this.load(); 
      },
      error: (e) => {
        console.error('Category API Error:', e);
        const detailedError = e.error?.errors ? e.error.errors.join(', ') : (e.error?.message || 'Operation failed.');
        this.messageService.add({ severity: 'error', summary: 'Error', detail: detailedError });
      }
    });
  }

  toggleStatus(c: Category) {
    this.categoryService.update(c.categoryId, c).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `${c.name} is now ${c.isActive ? 'Active' : 'Inactive'}.` }),
      error: () => {
        c.isActive = !c.isActive;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status.' });
      }
    });
  }

  confirmDelete(c: Category) {
    this.confirmationService.confirm({
      message: `Delete category "<b>${c.name}</b>"?`, header: 'Confirm Delete', icon: 'pi pi-exclamation-triangle',
      accept: () => this.categoryService.delete(c.categoryId).subscribe({ next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Category deleted.' }); this.load(); }, error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed.' }) })
    });
  }
  isInvalid(f: string): boolean { const c = this.form.get(f); return !!(c && c.invalid && (c.dirty || c.touched)); }
}
