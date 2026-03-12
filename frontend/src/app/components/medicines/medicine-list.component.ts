import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Medicine, MedicineService, MedicineSearchParameters } from '../../services/medicine.service';
import { CategoryService, Category } from '../../services/category.service';
import { UomService, Uom } from '../../services/uom.service';
import { GenericService, Generic } from '../../services/generic.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CalendarModule } from 'primeng/calendar';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-medicine-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, 
    InputTextModule, InputNumberModule, TagModule, DialogModule, SelectModule, 
    CalendarModule, PaginatorModule, ToastModule, ConfirmDialogModule
  ],
  template: `
    <div class="page-wrap animate-fadein-up">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <!-- ─── Page Header ─── -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Medicine Inventory</h1>
          <p class="page-sub">Manage your medicines, stock levels and expiry dates.</p>
        </div>
        <button class="btn-primary" (click)="openAdd()">
          <i class="pi pi-plus"></i> Add Medicine
        </button>
      </div>

      <!-- ─── Summary Chips ─── -->
      <div class="summary-row">
        <div class="chip chip-teal">
          <i class="pi pi-box"></i>
          <span>{{ totalCount() }} Total</span>
        </div>
        <div class="chip chip-green">
          <i class="pi pi-check-circle"></i>
          <span>Active & In Stock</span>
        </div>
      </div>

      <!-- ─── Search + Table Card ─── -->
      <div class="table-card">

        <!-- Search Bar -->
        <div class="table-toolbar">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input class="search-input" type="text"
                   [(ngModel)]="searchText"
                   (ngModelChange)="onSearchChange($event)"
                   placeholder="Search by name, code or generic…"/>
            <button *ngIf="searchText" class="search-clear" (click)="clearSearch()">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <span class="result-count">{{ totalCount() }} items found</span>
        </div>

        <!-- Table -->
        <div class="table-responsive">
          <p-table [value]="medicines()" 
                   [responsiveLayout]="'scroll'"
                   styleClass="p-datatable-sm"
                   [rowHover]="true"
                   [loading]="loading"
                   emptyMessage="No medicines found.">
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 100px;">Code</th>
                <th pSortableColumn="name" style="min-width: 150px;">Name <p-sortIcon field="name"></p-sortIcon></th>
                <th>Category</th>
                <th>Generic</th>
                <th>UOM</th>
                <th class="text-right">Purchase</th>
                <th class="text-right">Sale</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th class="text-center">Stock</th>
                <th>Status</th>
                <th style="width: 130px;">Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-medicine>
              <tr>
                <td><span class="text-xs font-mono text-muted">{{ medicine.code }}</span></td>
                <td><div class="med-name">{{ medicine.name }}</div></td>
                <td><span class="badge badge-slate">{{ medicine.category }}</span></td>
                <td class="text-muted text-xs">{{ medicine.genericName }}</td>
                <td><span class="badge badge-slate">{{ medicine.uom }}</span></td>
                <td class="text-right text-xs">{{ medicine.purchasePrice | currency:'BDT ' }}</td>
                <td class="text-right font-semibold">{{ medicine.salePrice | currency:'BDT ' }}</td>
                <td><span class="text-xs">{{ medicine.batch || '-' }}</span></td>
                <td><span class="text-xs" [class.text-danger]="isExpired(medicine.expiryDate)">{{ (medicine.expiryDate | date:'MMM yyyy') || '-' }}</span></td>
                <td class="text-center">
                  <span class="stock-badge"
                        [class.stock-low]="medicine.stockQuantity < 10"
                        [class.stock-ok]="medicine.stockQuantity >= 10">
                    {{ medicine.stockQuantity }}
                  </span>
                </td>
                <td>
                  <p-tag [value]="medicine.isActive ? 'Active' : 'Inactive'"
                         [severity]="medicine.isActive ? 'success' : 'secondary'"></p-tag>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="act-btn act-view" (click)="viewDetails(medicine)" title="Details">
                      <i class="pi pi-eye"></i>
                    </button>
                    <button class="act-btn act-edit" (click)="openEdit(medicine)" title="Edit">
                      <i class="pi pi-pencil"></i>
                    </button>
                    <button class="act-btn act-del" (click)="deleteMedicine(medicine.medicineId)" title="Delete">
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
        
        <p-paginator [rows]="pageSize" [totalRecords]="totalCount()" 
                     (onPageChange)="onPageChange($event)"
                     [rowsPerPageOptions]="[5, 10, 20, 50]"></p-paginator>
      </div>

      <!-- ─── Add/Edit Dialog ─── -->
      <p-dialog [(visible)]="showDialog" [modal]="true"
                [style]="{width:'95vw', maxWidth:'650px'}" 
                [closable]="true" [draggable]="false" [resizable]="false"
                styleClass="premium-dialog">
        
        <ng-template pTemplate="header">
          <div class="dialog-header-custom">
            <div class="header-icon-hex">
              <i class="pi" [class.pi-plus]="!editMode" [class.pi-pencil]="editMode"></i>
            </div>
            <div>
              <h2 class="dialog-title-text">{{ editMode ? 'Edit Medicine' : 'Add New Medicine' }}</h2>
              <p class="dialog-sub-text">Enter the details for the medicine record below.</p>
            </div>
          </div>
        </ng-template>

        <form [formGroup]="medicineForm" class="med-form-premium">
          <div class="form-scroll-area">
            
            <!-- ─── Section 1: Basic Info ─── -->
            <div class="form-section">
              <div class="section-tag"><i class="pi pi-info-circle"></i> BASIC INFORMATION</div>
              <div class="grid-form-premium">
                <div class="form-field-premium full">
                  <label class="field-label-premium">
                    <i class="pi pi-tag label-icon"></i> Medicine Name <span class="required">*</span>
                  </label>
                  <input type="text" pInputText formControlName="name" #medName
                         (keydown.enter)="onEnter(generic)"
                         placeholder="e.g. Napa Extra 500mg" class="w-full premium-input">
                  <small class="error-text" *ngIf="medicineForm.get('name')?.invalid && medicineForm.get('name')?.touched">
                    Name is required (min 3 chars).
                  </small>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-qrcode label-icon"></i> System Code
                  </label>
                  <input type="text" pInputText formControlName="code" [readonly]="true" class="w-full premium-input readonly-input">
                  <small class="info-text">Generated automatically by system.</small>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-filter label-icon"></i> Generic Name
                  </label>
                  <p-select [options]="generics" optionLabel="name" optionValue="name" #generic
                            (keydown.enter)="onEnter(cat)"
                            formControlName="genericName" [filter]="true" filterBy="name"
                            placeholder="Select Generic" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-book item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                </div>
              </div>
            </div>

            <!-- ─── Section 2: Classification ─── -->
            <div class="form-section">
              <div class="section-tag"><i class="pi pi-th-large"></i> CLASSIFICATION & UNITS</div>
              <div class="grid-form-premium">
                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-tags label-icon"></i> Category
                  </label>
                  <p-select [options]="categories" optionLabel="name" optionValue="name" #cat
                            (keydown.enter)="onEnter(uom)"
                            formControlName="category" [filter]="true" filterBy="name"
                            placeholder="Select Category" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-folder item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                </div>

                <div class="form-field-premium uom-field">
                  <label class="field-label-premium">
                    <i class="pi pi-box label-icon"></i> Unit of Measure (UOM) <span class="required">*</span>
                  </label>
                  <p-select [options]="uoms" optionLabel="name" optionValue="name" #uom
                            (keydown.enter)="onEnter(price)"
                            formControlName="uom" [filter]="true" filterBy="name"
                            placeholder="Select UOM" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-stop item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                  <small class="error-text" *ngIf="medicineForm.get('uom')?.invalid && medicineForm.get('uom')?.touched">
                    UOM is required.
                  </small>
                </div>
              </div>
            </div>

            <!-- ─── Section 3: Pricing & Batch ─── -->
            <div class="form-section">
              <div class="section-tag"><i class="pi pi-dollar"></i> PRICING & BATCH INFO</div>
              <div class="grid-form-premium">
                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-shopping-cart label-icon"></i> Purchase Price
                  </label>
                  <p-inputNumber formControlName="purchasePrice" mode="currency" currency="BDT" locale="en-BD"
                                 (keydown.enter)="onEnter(price)"
                                 placeholder="0.00" styleClass="w-full premium-input-number"></p-inputNumber>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-money-bill label-icon"></i> Sale Price <span class="required">*</span>
                  </label>
                  <p-inputNumber formControlName="salePrice" mode="currency" currency="BDT" locale="en-BD" #price
                                 (keydown.enter)="onEnter(batch)"
                                 placeholder="0.00" styleClass="w-full premium-input-number"></p-inputNumber>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-tag label-icon"></i> Batch Number
                  </label>
                  <input pInputText formControlName="batch" #batch
                         (keydown.enter)="onEnter(expiry)"
                         placeholder="e.g. B-2024" class="premium-input"/>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-calendar label-icon"></i> Expiry Date
                  </label>
                  <p-calendar formControlName="expiryDate" #expiry
                              [showIcon]="true" appendTo="body"
                              (keydown.enter)="onEnter(stock)"
                              placeholder="Select Date" styleClass="w-full premium-calendar"></p-calendar>
                </div>

                <div class="form-field-premium">
                   <label class="field-label-premium">
                    <i class="pi pi-box label-icon"></i> Opening Stock
                  </label>
                  <p-inputNumber formControlName="stockQuantity" #stock
                                 (keydown.enter)="onEnter(statusToggle)"
                                 placeholder="0" styleClass="w-full premium-input-number"></p-inputNumber>
                </div>

                <div class="form-field-premium status-field">
                  <label class="field-label-premium">
                    <i class="pi pi-eye label-icon"></i> Status
                  </label>
                  <div class="status-toggle-wrap">
                    <span [class.active-txt]="medicineForm.get('isActive')?.value">
                      {{ medicineForm.get('isActive')?.value ? 'Active' : 'Inactive' }}
                    </span>
                    <label class="premium-switch">
                      <input type="checkbox" formControlName="isActive" #statusToggle (keydown.enter)="saveMedicine()">
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
            <button class="btn-cancel" (click)="showDialog=false">
              <i class="pi pi-times"></i> Cancel
            </button>
            <button class="btn-save" (click)="saveMedicine()" [disabled]="medicineForm.invalid || saving">
              <i class="pi" [class.pi-spin]="saving" [class.pi-spinner]="saving" [class.pi-check-circle]="!saving"></i>
              <span>{{ saving ? 'Saving Changes...' : 'Save Medicine' }}</span>
            </button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- ─── Details Dialog ─── -->
      <p-dialog [(visible)]="showDetailsDialog" [modal]="true"
                [style]="{width:'95vw', maxWidth:'500px'}" 
                header="Medicine Details" [closable]="true">
        <div *ngIf="selectedMedicine() as med" class="details-grid">
          <div class="det-row"><strong>Code:</strong> <span>{{ med.code }}</span></div>
          <div class="det-row"><strong>Name:</strong> <span>{{ med.name }}</span></div>
          <div class="det-row"><strong>Generic:</strong> <span>{{ med.genericName }}</span></div>
          <div class="det-row"><strong>Category:</strong> <span>{{ med.category }}</span></div>
          <div class="det-row"><strong>UOM:</strong> <span>{{ med.uom }}</span></div>
          <div class="det-row"><strong>Purchase Price:</strong> <span>{{ med.purchasePrice | currency:'BDT ' }}</span></div>
          <div class="det-row"><strong>Sale Price:</strong> <span>{{ med.salePrice | currency:'BDT ' }}</span></div>
          <div class="det-row"><strong>Batch:</strong> <span>{{ med.batch || 'N/A' }}</span></div>
          <div class="det-row"><strong>Expiry:</strong> <span [class.text-danger]="isExpired(med.expiryDate)">{{ (med.expiryDate | date:'dd MMM yyyy') || 'N/A' }}</span></div>
          <div class="det-row"><strong>Stock:</strong> <span>{{ med.stockQuantity }}</span></div>
          <div class="det-row"><strong>Status:</strong> <span>{{ med.isActive ? 'Active' : 'Inactive' }}</span></div>
        </div>
      </p-dialog>
    </div>
  `,
  styles: [`
    .details-grid { display: flex; flex-direction: column; gap: 12px; padding: 10px 0; }
    .det-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .text-danger { color: #ef4444; font-weight: 600; }
    :host { display: block; width: 100%; }
    .page-wrap { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .page-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub   { font-size: .875rem; color: #64748b; margin: 0; }

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

    .btn-secondary {
      display: flex; align-items: center; gap: 8px;
      background: #f1f5f9; color: #334155;
      border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 10px 18px;
      font-size: .875rem; font-weight: 600;
      cursor: pointer; font-family: 'Inter', sans-serif;
    }

    .summary-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: .8rem; font-weight: 600; }
    .chip-teal   { background: #ccfbf1; color: #0f766e; }
    .chip-green  { background: #dcfce7; color: #15803d; }

    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
    .table-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; gap: 12px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: .875rem; pointer-events: none; }
    .search-input { width: 100%; padding: 9px 36px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: .875rem; font-family: 'Inter', sans-serif; outline: none; transition: border-color .15s; background: #f8fafc; color: #0f172a; }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: .875rem; }
    .result-count { font-size: .8rem; color: #94a3b8; }

    .table-responsive { overflow-x: auto; width: 100%; }
    .med-name { font-weight: 600; color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: .72rem; font-weight: 600; }
    .badge-slate { background: #f1f5f9; color: #475569; }
    .stock-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: .75rem; font-weight: 700; background: #f1f5f9; color: #334155; }
    .stock-low  { background: #fee2e2; color: #b91c1c; }
    .stock-ok   { background: #dcfce7; color: #15803d; }
    .expiry-warn { color: #d97706; font-weight: 600; }
    .expiry-expired { color: #dc2626; font-weight: 600; }

    .action-btns { display: flex; gap: 4px; }
    .act-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .1s; }
    .act-btn:hover { transform: scale(1.1); }
    .act-edit { background: #eff6ff; color: #3b82f6; }
    .act-del  { background: #fff1f2; color: #f43f5e; }

    /* ─── Premium Dialog & Form (Optimized for 100% Zoom) ─── */
    ::ng-deep .premium-dialog .p-dialog-header { background: #fff; border-bottom: 1px solid #f1f5f9; padding: 14px 20px; border-radius: 16px 16px 0 0; }
    ::ng-deep .premium-dialog .p-dialog-content { padding: 0 !important; border-radius: 0 0 16px 16px; overflow-y: visible; }
    ::ng-deep .premium-dialog .p-dialog-footer { padding: 12px 20px; border-top: 1px solid #f1f5f9; background: #fafafa; border-radius: 0 0 16px 16px; }

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
    ::ng-deep .label-icon { color: #94a3b8; font-size: .8rem; }
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
    ::ng-deep .premium-input-number { width: 100%; }
    ::ng-deep .premium-input-number input { border-radius: 10px; width: 100%; border: 1.5px solid #e2e8f0; padding: 8px 12px; font-size: .8rem; }

    ::ng-deep .info-text { font-size: .65rem; color: #94a3b8; font-style: italic; margin-top: 1px; }
    ::ng-deep .error-text { color: #f43f5e; font-size: .68rem; font-weight: 500; margin-top: 1px; }

    ::ng-deep .select-item-custom { display: flex; align-items: center; gap: 8px; padding: 1px 0; font-size: .8rem; }
    ::ng-deep .item-icon { color: #94a3b8; font-size: .85rem; }

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

    /* Footer Buttons */
    ::ng-deep .premium-dialog-footer { display: flex; justify-content: flex-end; gap: 10px; width: 100%; }
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

    /* Centering and Overlay Fix (Clean approach) */
    ::ng-deep .p-dialog-mask { 
      background-color: rgba(15, 23, 42, 0.6) !important; 
      backdrop-filter: blur(4px); 
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    ::ng-deep .premium-dialog { 
      margin: 0 !important; 
      max-height: 95vh;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class MedicineListComponent implements OnInit {
  medicines = signal<Medicine[]>([]);
  totalCount = signal<number>(0);
  loading = false;
  saving = false;
  
  searchText = '';
  private searchSubject = new Subject<string>();
  
  pageNumber = 1;
  pageSize = 10;
  
  showDialog = false;
  editMode = false;
  
  selectedMedicine = signal<Medicine | null>(null);
  showDetailsDialog = false;
  
  medicineForm: FormGroup;
  
  categories: Category[] = [];
  generics: Generic[] = [];
  uoms: Uom[] = [];
  
  today = new Date();

  constructor(
    private medicineService: MedicineService,
    private categoryService: CategoryService,
    private genericService: GenericService,
    private uomService: UomService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.medicineForm = this.fb.group({
      medicineId: [0],
      code: [''], // Auto-generated
      name: ['', [Validators.required, Validators.minLength(3)]],
      genericName: [''],
      category: [''],
      uom: ['', Validators.required],
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      salePrice: [0, [Validators.required, Validators.min(0)]],
      stockQuantity: [0, [Validators.required, Validators.min(0)]],
      batch: [''],
      expiryDate: [null],
      isActive: [true]
    });

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageNumber = 1;
      this.loadMedicines();
    });
  }

  ngOnInit() {
    this.loadMedicines();
    this.loadMasterData();
  }

  loadMedicines() {
    this.loading = true;
    const params: MedicineSearchParameters = {
      searchText: this.searchText,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    };

    this.medicineService.getMedicines(params).subscribe({
      next: (res) => {
        this.medicines.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load medicines.' });
        this.loading = false;
      }
    });
  }

  loadMasterData() {
    this.categoryService.getAll().subscribe(data => this.categories = data);
    this.genericService.getAll().subscribe(data => this.generics = data);
    this.uomService.getAll().subscribe(data => this.uoms = data);
  }

  onSearchChange(text: string) {
    this.searchSubject.next(text);
  }

  clearSearch() {
    this.searchText = '';
    this.searchSubject.next('');
  }

  onPageChange(event: any | PaginatorState) {
    this.pageNumber = (event.page || 0) + 1;
    this.pageSize = event.rows || 10;
    this.loadMedicines();
  }

  openAdd() {
    this.editMode = false;
    this.medicineForm.reset({
      medicineId: 0,
      code: 'FETCHING...',
      salePrice: 0,
      isActive: true
    });
    
    // Fetch Next Code from Backend
    this.medicineService.getNextCode().subscribe({
      next: (res) => this.medicineForm.patchValue({ code: res.code }),
      error: () => this.medicineForm.patchValue({ code: 'ERROR-GEN' })
    });

    this.showDialog = true;
    
    // Smooth focus after dialog animation
    setTimeout(() => {
      const el = document.querySelector('.premium-input') as HTMLElement;
      if (el) el.focus();
    }, 100);
  }

  openEdit(med: Medicine) {
    this.editMode = true;
    this.medicineForm.patchValue({
      ...med
    });
    this.showDialog = true;
    
    setTimeout(() => {
      const el = document.querySelector('.premium-input') as HTMLElement;
      if (el) el.focus();
    }, 100);
  }

  viewDetails(med: Medicine) {
    this.selectedMedicine.set(med);
    this.showDetailsDialog = true;
  }


  onEnter(nextEl: any) {
    if (nextEl) {
      if (nextEl.focusInput) nextEl.focusInput(); // For PrimeNG components
      else if (nextEl.focus) nextEl.focus();
      else if (nextEl.element?.focus) nextEl.element.focus();
    }
  }

  saveMedicine() {
    if (this.medicineForm.invalid) return;

    this.saving = true;
    const val = this.medicineForm.value;
    
    // Removing the code field if it's the placeholder for new items
    if (!this.editMode && (val.code === 'AUTO-GENERATE' || val.code === 'FETCHING...')) {
      delete val.code;
    }

    const obs = this.editMode 
      ? this.medicineService.updateMedicine(val.medicineId, val)
      : this.medicineService.createMedicine(val);

    obs.subscribe({
      next: () => {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: `Medicine ${this.editMode ? 'updated' : 'added'} successfully.` 
        });
        this.saving = false;
        this.showDialog = false;
        this.loadMedicines();
      },
      error: (err) => {
        const msg = err.error?.message || 'Operation failed.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        this.saving = false;
      }
    });
  }

  deleteMedicine(id: number) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this medicine?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.medicineService.deleteMedicine(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Medicine removed.' });
            this.loadMedicines();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed.' });
          }
        });
      }
    });
  }

  isExpired(date?: string): boolean {
    if (!date) return false;
    return new Date(date) < this.today;
  }
}
