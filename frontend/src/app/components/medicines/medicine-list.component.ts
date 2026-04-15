import { Component, OnInit, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Medicine, MedicineService, MedicineSearchParameters } from '../../services/medicine.service';
import { CategoryService, Category } from '../../services/category.service';
import { UomService, Uom } from '../../services/uom.service';
import { GenericService, Generic } from '../../services/generic.service';
import { ManufacturerService, Manufacturer } from '../../services/manufacturer.service';
import { DosageFormService, DosageForm } from '../../services/dosage-form.service';
import { CommonStrengthService, CommonStrength } from '../../services/common-strength.service';
import { UseForService, UseFor } from '../../services/use-for.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-medicine-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule,
    InputTextModule, InputNumberModule, TagModule, DialogModule, SelectModule,
    DatePickerModule, PaginatorModule, ToastModule, ConfirmDialogModule, TooltipDirective
  ],
  template: `
    <div class="page-wrap animate-fadein-up" *ngIf="isSystemAdmin() || hasPermission('Medicines')">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <!-- Sticky Header Area -->
      <div id="main-sticky-zone" class="sticky-header">
        <div class="page-head pt-2 pb-1 px-4">
          <div style="margin-left: 12px;">
            <h1 class="page-title">Medicine Inventory</h1>
            <p class="page-sub text-xs">Manage your medicines, stock levels and expiry dates.</p>
          </div>
          <button class="btn-primary" (click)="openAdd()" title="Shortcut: Alt + N" *ngIf="isSystemAdmin() || hasPermission('Medicines', 'create')">
            <i class="pi pi-plus"></i>
            <span>New Medicine</span>
          </button>
        </div>

        <!-- ─── Table Toolbar ─── -->
        <div class="table-toolbar px-4 py-1">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input #searchInput type="text" pInputText [(ngModel)]="searchText" 
                   (input)="onSearchChange(searchText)"
                   placeholder="Search..." 
                   class="search-input">
            <button class="search-clear" *ngIf="searchText" (click)="clearSearch()">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="flex items-center gap-4">
            <span class="result-count font-semibold">{{ totalCount() }} items found</span>
            <div class="summary-row">
              <div class="chip chip-teal"><i class="pi pi-box"></i> {{ totalCount() }} Total</div>
            </div>
          </div>
        </div>

      </div>

        <div class="table-card">
          <!-- Table -->
          <div class="table-responsive">
          <p-table [value]="medicines()" 
                   [scrollable]="true"
                   scrollHeight="calc(100vh - 230px)"
                   styleClass="p-datatable-sm"
                   [rowHover]="true"
                   [loading]="loading"
                   emptyMessage="No medicines found.">
            <ng-template pTemplate="header">
              <tr>
                <th class="hidden lg:table-cell" style="min-width: 100px;">Code</th>
                <th pSortableColumn="name" style="min-width: 150px;">Name <p-sortIcon field="name"></p-sortIcon></th>
                <th class="hidden md:table-cell" style="min-width: 140px;">Cat.</th>
                <th class="hidden xl:table-cell" style="min-width: 150px;">Manufacturer</th>
                <th class="hidden xl:table-cell" style="min-width: 120px;">Dosage Form</th>
                <th class="hidden xl:table-cell" style="min-width: 100px;">Strength</th>
                <th class="hidden lg:table-cell" style="min-width: 130px;">Generic</th>
                <th class="hidden lg:table-cell" style="min-width: 80px;">UOM</th>
                <th class="hidden xl:table-cell" style="min-width: 150px;">Use For</th>
                <th class="text-right hidden lg:table-cell" style="min-width: 100px;">Purchase</th>
                <th class="text-right" style="min-width: 90px;">Sale</th>
                <th class="hidden md:table-cell" style="min-width: 100px;">Batch</th>
                <th class="hidden md:table-cell" style="min-width: 100px;">Expiry</th>
                <th class="text-center" style="min-width: 70px;">Stock</th>
                <th class="hidden lg:table-cell" style="min-width: 100px;">Status</th>
                <th style="min-width: 110px;" alignFrozen="right" pFrozenColumn>Actions</th>
              </tr>
            </ng-template>
             <ng-template pTemplate="body" let-medicine>
              <tr>
                <td class="hidden lg:table-cell"><span class="med-code-badge">{{ medicine.code }}</span></td>
                <td>
                  <div class="flex items-center gap-2" style="white-space: nowrap;">
                    <span class="med-name text-sm">{{ medicine.name }}</span>
                    <i *ngIf="isIncomplete(medicine)" class="pi pi-exclamation-circle incomplete-icon" 
                       [appTooltip]="'Incomplete Information: Missing category, manufacturer, or dosage details.'"></i>
                  </div>
                </td>
                <td class="hidden md:table-cell"><span class="category-badge">{{ medicine.category }}</span></td>
                <td class="text-muted text-xs hidden xl:table-cell" style="white-space: nowrap;">{{ medicine.manufacturer || '-' }}</td>
                <td class="text-muted text-xs hidden xl:table-cell" style="white-space: nowrap;">{{ medicine.dosageForm || '-' }}</td>
                <td class="text-muted text-xs hidden xl:table-cell" style="white-space: nowrap;">{{ medicine.strength || '-' }}</td>
                <td class="text-muted text-xs hidden lg:table-cell" style="white-space: nowrap;">{{ medicine.genericName || '-' }}</td>
                <td class="hidden lg:table-cell"><span class="uom-badge">{{ medicine.uom }}</span></td>
                <td class="text-muted text-xs hidden xl:table-cell" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="medicine.useFor">
                  {{ medicine.useFor || '-' }}
                </td>
                <td class="text-right text-xs hidden lg:table-cell" style="white-space: nowrap;">{{ medicine.purchasePrice | currency:'Tk ' }}</td>
                <td class="text-right font-semibold text-sm" style="white-space: nowrap;">{{ medicine.salePrice | currency:'Tk ' }}</td>
                <td class="hidden md:table-cell"><span class="batch-badge">{{ medicine.batch || '-' }}</span></td>
                <td class="hidden md:table-cell"><span class="text-xs text-muted" [class.text-danger]="isExpired(medicine.expiryDate)" style="white-space: nowrap;">{{ (medicine.expiryDate | date:'dd/MM/yyyy') || '-' }}</span></td>
                <td class="text-center">
                  <span class="stock-badge"
                        [class.stock-low]="medicine.stockQuantity < 10"
                        [class.stock-ok]="medicine.stockQuantity >= 10">
                    {{ medicine.stockQuantity }}
                  </span>
                </td>
                <td class="hidden lg:table-cell">
                  <button class="status-toggle-btn"
                          [class.active]="medicine.isActive"
                          (click)="toggleStatus(medicine)"
                          [disabled]="!isSystemAdmin() && !hasPermission('Medicines', 'edit')"
                          [title]="medicine.isActive ? 'Click to Deactivate' : 'Click to Activate'">
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                    <span class="toggle-label">{{ medicine.isActive ? 'Active' : 'Inactive' }}</span>
                  </button>
                </td>
                <td alignFrozen="right" pFrozenColumn>
                  <div class="action-btns">
                    <button class="act-btn act-view" (click)="viewDetails(medicine)" [appTooltip]="'View Full Details'">
                      <i class="pi pi-eye"></i>
                    </button>
                    <button class="act-btn act-edit" (click)="openEdit(medicine)" [appTooltip]="'Edit Record'" *ngIf="isSystemAdmin() || hasPermission('Medicines', 'edit')">
                      <i class="pi pi-pencil"></i>
                    </button>
                    <button class="act-btn act-del" (click)="deleteMedicine(medicine.medicineId)" [appTooltip]="'Delete Medicine'" *ngIf="isSystemAdmin() || hasPermission('Medicines', 'delete')">
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
              <span class="section-tag"><i class="pi pi-tag"></i> Primary Identity</span>
              <div class="grid-form-premium">
                <div class="form-field-premium">
                  <label class="field-label-premium">Brand/Trade Name <span class="required">*</span></label>
                  <input #brandNameInput type="text" pInputText formControlName="name" 
                         (focus)="$any($event.target).select()"
                         class="premium-input" placeholder="e.g. Napa Extend">
                  <small class="error-text" *ngIf="f['name'].touched && f['name'].errors?.['required']">Brand name is required</small>
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
                            (keydown.enter)="onEnter(manufacturer)"
                            formControlName="genericName" [filter]="true" filterBy="name"
                            placeholder="Select Generic" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-book item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                  <a href="javascript:void(0)" class="quick-add-link" (click)="openQuickAdd('Generic')" *ngIf="isSystemAdmin() || hasPermission('Master Data', 'create')">
                    <i class="pi pi-plus-circle"></i> Add Quick Generic
                  </a>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-building label-icon"></i> Manufacturer
                  </label>
                  <p-select [options]="manufacturers" optionLabel="name" optionValue="name" #manufacturer
                            (keydown.enter)="onEnter(cat)"
                            formControlName="manufacturer" [filter]="true" filterBy="name"
                            placeholder="Select Manufacturer" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-building item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                  <a href="javascript:void(0)" class="quick-add-link" (click)="openQuickAdd('Manufacturer')" *ngIf="isSystemAdmin() || hasPermission('Master Data', 'create')">
                    <i class="pi pi-plus-circle"></i> Add Quick Manufacturer
                  </a>
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
                  <a href="javascript:void(0)" class="quick-add-link" (click)="openQuickAdd('Category')" *ngIf="isSystemAdmin() || hasPermission('Master Data', 'create')">
                    <i class="pi pi-plus-circle"></i> Add Quick Category
                  </a>
                </div>

                <div class="form-field-premium uom-field">
                  <label class="field-label-premium">
                    <i class="pi pi-box label-icon"></i> Unit of Measure (UOM) <span class="required">*</span>
                  </label>
                  <p-select [options]="uoms" optionLabel="name" optionValue="name" #uom
                            (keydown.enter)="onEnter(dosage)"
                            formControlName="uom" [filter]="true" filterBy="name"
                            placeholder="Select UOM" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-stop item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                  <a href="javascript:void(0)" class="quick-add-link" (click)="openQuickAdd('UOM')" *ngIf="isSystemAdmin() || hasPermission('Master Data', 'create')">
                    <i class="pi pi-plus-circle"></i> Add Quick UOM
                  </a>
                  <small class="error-text" *ngIf="medicineForm.get('uom')?.invalid && medicineForm.get('uom')?.touched">
                    UOM is required.
                  </small>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-briefcase label-icon"></i> Dosage Form
                  </label>
                  <p-select [options]="dosageForms" optionLabel="name" optionValue="name" #dosage
                            (keydown.enter)="onEnter(strength)"
                            formControlName="dosageForm" [filter]="true" filterBy="name"
                            placeholder="Select Dosage Form" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-briefcase item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                  <a href="javascript:void(0)" class="quick-add-link" (click)="openQuickAdd('Dosage Form')" *ngIf="isSystemAdmin() || hasPermission('Master Data', 'create')">
                    <i class="pi pi-plus-circle"></i> Add Quick Dosage Form
                  </a>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-bolt label-icon"></i> Strength
                  </label>
                  <p-select [options]="strengths" optionLabel="name" optionValue="name" #strength
                            (keydown.enter)="onEnter(usefor)"
                            formControlName="strength" [filter]="true" filterBy="name"
                            placeholder="Select Strength" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-bolt item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                  <a href="javascript:void(0)" class="quick-add-link" (click)="openQuickAdd('Strength')" *ngIf="isSystemAdmin() || hasPermission('Master Data', 'create')">
                    <i class="pi pi-plus-circle"></i> Add Quick Strength
                  </a>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">
                    <i class="pi pi-question-circle label-icon"></i> Use For
                  </label>
                  <p-select [options]="useFors" optionLabel="name" optionValue="name" #usefor
                            (keydown.enter)="onEnter(price)"
                            formControlName="useFor" [filter]="true" filterBy="name"
                            placeholder="Select Use For" [showClear]="true" styleClass="w-full premium-select">
                    <ng-template let-item pTemplate="item">
                      <div class="select-item-custom">
                        <i class="pi pi-question-circle item-icon"></i>
                        <span>{{ item.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                  <a href="javascript:void(0)" class="quick-add-link" (click)="openQuickAdd('Use For')" *ngIf="isSystemAdmin() || hasPermission('Master Data', 'create')">
                    <i class="pi pi-plus-circle"></i> Add Quick Use For
                  </a>
                </div>
              </div>
            </div>

            <!-- ─── Section 3: Pricing & Batch ─── -->
            <div class="form-section">
              <div class="section-tag"><i class="pi pi-dollar"></i> PRICING & BATCH INFO</div>
              <div class="grid-form-premium">
                <div class="form-field-premium">
                  <label class="field-label-premium">Purchase Price <span class="required">*</span></label>
                  <p-inputNumber #price formControlName="purchasePrice" mode="decimal" [minFractionDigits]="2" 
                                 styleClass="premium-input-number" placeholder="0.00"
                                 (onFocus)="$any($event.target).select()"></p-inputNumber>
                </div>

                <div class="form-field-premium">
                  <label class="field-label-premium">Sale Price <span class="required">*</span></label>
                  <p-inputNumber formControlName="salePrice" mode="decimal" [minFractionDigits]="2" 
                                 styleClass="premium-input-number" placeholder="0.00"
                                 (onFocus)="$any($event.target).select()"></p-inputNumber>
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
                  <p-datepicker formControlName="expiryDate" #expiry
                              [showIcon]="true" appendTo="body"
                              (keydown.enter)="onEnter(stock)"
                              placeholder="Select Date" styleClass="w-full premium-calendar"></p-datepicker>
                </div>

                <div class="form-field-premium">
                   <label class="field-label-premium">Opening Stock</label>
                  <p-inputNumber #stock formControlName="stockQuantity" mode="decimal" 
                                 styleClass="premium-input-number" placeholder="0"
                                 (onFocus)="$any($event.target).select()"></p-inputNumber>
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
                [style]="{width:'95vw', maxWidth:'650px'}" 
                [closable]="true" styleClass="premium-dialog">
        
        <ng-template pTemplate="header">
          <div class="dialog-header-custom">
            <div class="header-icon-hex">
              <i class="pi pi-info-circle"></i>
            </div>
            <div>
              <h2 class="dialog-title-text">Medicine Details</h2>
              <p class="dialog-sub-text">Full information and batch-wise stock status.</p>
            </div>
          </div>
        </ng-template>

        <div *ngIf="selectedMedicine() as med" class="details-wrap">
          <div class="det-grid">
            <div class="det-item"><span>System Code</span><strong>{{ med.code }}</strong></div>
            <div class="det-item"><span>Brand Name</span><strong>{{ med.name }}</strong></div>
            <div class="det-item"><span>Generic Name</span><strong>{{ med.genericName || 'N/A' }}</strong></div>
            <div class="det-item"><span>Manufacturer</span><strong>{{ med.manufacturer || 'N/A' }}</strong></div>
            <div class="det-item"><span>Category</span><strong>{{ med.category || 'N/A' }}</strong></div>
            <div class="det-item"><span>Dosage Form</span><strong>{{ med.dosageForm || 'N/A' }}</strong></div>
            <div class="det-item"><span>Strength</span><strong>{{ med.strength || 'N/A' }}</strong></div>
            <div class="det-item"><span>Use For</span><strong>{{ med.useFor || 'N/A' }}</strong></div>
            <div class="det-item"><span>UOM</span><strong>{{ med.uom }}</strong></div>
            <div class="det-item"><span>Purchase Price</span><strong>{{ med.purchasePrice | currency:'Tk ' }}</strong></div>
            <div class="det-item"><span>Sale Price</span><strong>{{ med.salePrice | currency:'Tk ' }}</strong></div>
            <div class="det-item"><span>Opening Batch</span><strong>{{ med.batch || 'N/A' }}</strong></div>
            <div class="det-item"><span>Total Stock</span><strong class="text-teal">{{ med.stockQuantity }} {{ med.uom }}</strong></div>
            <div class="det-item"><span>Status</span><span [class.active-txt]="med.isActive" class="font-bold">{{ med.isActive ? 'Active' : 'Inactive' }}</span></div>
          </div>
          
          <div class="batch-section" *ngIf="med.batches && med.batches.length > 0">
            <h4 class="section-title"><i class="pi pi-box mr-1"></i> Batch-wise Stock Status</h4>
            <div class="batch-table-wrapper">
              <table class="batch-table">
                <thead>
                  <tr>
                    <th>Batch No</th>
                    <th>Expiry Date</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Remaining Stock</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let b of med.batches">
                    <td><span class="batch-no">{{ b.batchNumber }}</span></td>
                    <td><span [class.text-danger]="isExpired(b.expiryDate)">{{ (b.expiryDate | date:'dd/MM/yyyy') || '-' }}</span></td>
                    <td class="text-right">{{ b.purchasePrice | currency:'Tk ' }}</td>
                    <td class="text-right font-bold">{{ b.remainingQuantity }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <div class="premium-dialog-footer">
            <button class="btn-cancel" (click)="showDetailsDialog=false">
              <i class="pi pi-times"></i> Close
            </button>
            <button class="btn-save" (click)="openEdit(selectedMedicine()!)" *ngIf="isSystemAdmin() || hasPermission('Medicines', 'edit')">
              <i class="pi pi-pencil"></i>
              <span>Edit Records</span>
            </button>
          </div>
        </ng-template>
      </p-dialog>

      <p-dialog [(visible)]="showQuickAddDialog" [modal]="true"
                [style]="{width:'450px'}" 
                [closable]="true" [draggable]="false" [resizable]="false"
                appendTo="body" styleClass="premium-dialog">
        
        <ng-template pTemplate="header">
          <div class="dialog-header-custom">
            <div class="header-icon-hex">
              <i class="pi pi-plus-circle"></i>
            </div>
            <div>
              <h2 class="dialog-title-text">{{ quickAddTitle }}</h2>
              <p class="dialog-sub-text">Quickly add a new entry to the master records.</p>
            </div>
          </div>
        </ng-template>

        <div class="quick-add-form p-4">
          <div class="form-field-premium">
            <label class="field-label-premium">Name</label>
            <input type="text" pInputText id="quickAddInput" [(ngModel)]="quickAddName" 
                   (keydown.enter)="saveQuickAdd()"
                   class="w-full premium-input" placeholder="Enter name...">
          </div>
        </div>
        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2 p-2">
            <button class="btn-cancel" (click)="showQuickAddDialog=false">Cancel</button>
            <button class="btn-save" (click)="saveQuickAdd()" [disabled]="!quickAddName || quickAddSaving">
              <i class="pi" [class.pi-spin]="quickAddSaving" [class.pi-spinner]="quickAddSaving" [class.pi-check]="!quickAddSaving"></i>
              Save
            </button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .details-wrap { display: flex; flex-direction: column; gap: 14px; padding: 18px 24px; max-height: 70vh; overflow-y: auto; }
    .det-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .det-item { display: flex; flex-direction: column; gap: 2px; background: #f8fafc; border-radius: 8px; padding: 8px 12px; }
    .det-item span { font-size: .68rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
    .det-item strong { font-size: .85rem; color: #0f172a; }
    .text-teal { color: #0d9488; }
    .text-danger { color: #ef4444; font-weight: 600; }

    /* ─── Stock Badges ─── */
    .stock-badge {
      display: inline-block; padding: 2px 10px; border-radius: 99px;
      font-size: 0.75rem; font-weight: 700; min-width: 32px;
    }
    .stock-low { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
    .stock-ok  { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
    
    .batch-section { margin-top: 15px; border-top: 2px solid #f1f5f9; padding-top: 12px; margin-top: 5px; }
    .section-title { font-size: 0.9rem; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .batch-table-wrapper { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .batch-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .batch-table th { background: #f8fafc; padding: 8px; text-align: left; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    .batch-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .batch-table tr:last-child td { border-bottom: none; }
    .batch-no { font-family: monospace; color: #0d9488; font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-right { text-align: right; }

    /* ─── Status Toggle Switch ─── */
    .status-toggle-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: none; border: none; cursor: pointer; padding: 0;
      font-family: 'Inter', sans-serif;
    }
    .toggle-track {
      position: relative; width: 36px; height: 20px;
      background: #cbd5e1; border-radius: 99px;
      transition: background .25s;
      flex-shrink: 0;
    }
    .toggle-thumb {
      position: absolute; top: 3px; left: 3px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2);
      transition: transform .25s;
    }
    .status-toggle-btn.active .toggle-track { background: #0d9488; }
    .status-toggle-btn.active .toggle-thumb { transform: translateX(16px); }
    .toggle-label {
      font-size: .72rem; font-weight: 600;
      color: #64748b;
    }
    .status-toggle-btn.active .toggle-label { color: #0d9488; }
    :host { display: block; width: 100%; }
    .page-wrap { display: flex; flex-direction: column; width: 100%; }

    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: #0d9488; color: #fff;
      border: none; border-radius: 10px;
      padding: 9px 18px;
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

    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; margin-top: 8px; }
    .table-toolbar { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; gap: 12px; flex-wrap: wrap; padding: 12px 16px; }
    
    @media (max-width: 768px) {
      .page-head { flex-direction: column; align-items: stretch !important; gap: 12px !important; padding: 12px 16px !important; }
      .page-head > div { margin-left: 0 !important; }
      .btn-primary { width: 100%; justify-content: center; }
      .table-toolbar { flex-direction: column; align-items: stretch; gap: 12px; }
      .search-wrap { max-width: 100%; }
      .summary-row { justify-content: space-between; width: 100%; }
      .result-count { order: 2; }
    }
    .search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: .875rem; pointer-events: none; }
    .search-input { width: 100%; padding: 9px 36px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: .875rem; font-family: 'Inter', sans-serif; outline: none; transition: border-color .15s; background: #f8fafc; color: #0f172a; }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: .875rem; }
    .result-count { font-size: .8rem; color: #334155; font-weight: 700; }

    .table-responsive { overflow-x: auto; width: 100%; }
    .med-name { font-weight: 700; color: #0f172a; font-size: 0.95rem; }
    .text-muted { color: var(--color-text-muted); }
    .text-xs { font-size: 0.8rem; font-weight: 500; }
    .action-btns { display: flex; gap: 4px; }
    .act-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .1s; }
    .act-btn:hover { transform: scale(1.1); }
    .act-view { background: #eff6ff; color: #3b82f6; }
    .act-edit { background: #f0fdf4; color: #16a34a; }
    .act-del  { background: #fff1f2; color: #f43f5e; }

    /* New Professional Badges */
    .med-code-badge { font-family: monospace; background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 6px; font-size: .75rem; font-weight: 700; }
    .category-badge { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: .75rem; font-weight: 600; white-space: nowrap; }
    .uom-badge { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .batch-badge { background: #fffbeb; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .status-badge { padding: 3px 10px; border-radius: 99px; font-size: .72rem; font-weight: 700; white-space: nowrap; }
    .badge-active { background: #dcfce7; color: #15803d; }
    .badge-inactive { background: #fee2e2; color: #b91c1c; }

    /* ─── Premium Dialog & Form (Optimized for 100% Zoom) ─── */
    ::ng-deep .premium-dialog .p-dialog-header { background: #fff; border-bottom: 1px solid #f1f5f9; padding: 14px 20px; border-radius: 16px 16px 0 0; }
    ::ng-deep .premium-dialog .p-dialog-content { padding: 0 !important; border-radius: 0 0 16px 16px; overflow-y: visible; }
    ::ng-deep .premium-switch input:checked + .slider-premium:before { transform: translateX(18px); }

    /* Sticky Header Area - Aligned with Purchase List */
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #ffffff;
      border-bottom: 2px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .page-head { border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; }
    .page-title { font-size: 1.15rem !important; margin: 0; font-weight: 800; color: #1e293b; }
    .page-sub { margin: 2px 0 0; color: #334155; font-size: 0.8rem; font-weight: 500; }
    .search-input { height: 34px; font-size: 13px !important; }
    .table-toolbar { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }

    /* Table Header Styling - Matching Procurement Records */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background-color: #f1f5f9 !important;
      color: #0d9488 !important;
      font-weight: 800 !important;
      font-size: 0.75rem !important;
      text-transform: uppercase !important;
      letter-spacing: 0.7px !important;
      padding: 10px 12px !important;
      border-bottom: 2.5px solid #0d9488 !important;
    }
    
    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background-color: #ffffff !important;
      transition: background .2s;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 10px 12px !important;
      border-bottom: 1px solid #edf2f7;
    }

    ::ng-deep .badge-slate-light { background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }

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

    .incomplete-icon {
      color: #f59e0b; /* Amber/Yellow color */
      font-size: 0.85rem;
      animation: pulse 2s infinite;
    }
    .animate-fadein-up { animation: fadeIn .5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    @keyframes pulse {
      0% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 0.6; transform: scale(1); }
    }

    /* Quick Add UI */
    ::ng-deep .quick-add-link {
      font-size: .65rem; color: #0d9488; font-weight: 600;
      text-decoration: none; display: flex; align-items: center; gap: 4px;
      margin-top: 4px; align-self: flex-start; transition: color .15s;
    }
    ::ng-deep .quick-add-link:hover { color: #0f766e; text-decoration: underline; }
    
    ::ng-deep .quick-add-dialog .p-dialog-header { padding: 12px 16px; font-size: 1rem; border-bottom: 1px solid #f1f5f9; }
    ::ng-deep .quick-add-dialog .p-dialog-content { padding: 0 !important; }
    ::ng-deep .quick-add-dialog .p-dialog-footer { padding: 10px 16px; border-top: 1px solid #f1f5f9; }

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
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('brandNameInput') brandNameInput!: ElementRef;

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

  // Quick Add State
  showQuickAddDialog = false;
  quickAddType = '';
  quickAddName = '';
  quickAddSaving = false;
  quickAddTitle = '';

  medicineForm: FormGroup;

  categories: Category[] = [];
  generics: Generic[] = [];
  uoms: Uom[] = [];
  manufacturers: Manufacturer[] = [];
  dosageForms: DosageForm[] = [];
  strengths: CommonStrength[] = [];
  useFors: UseFor[] = [];

  today = new Date();

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.altKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      this.openAdd();
    }
    if (event.altKey && event.key.toLowerCase() === 's' && this.showDialog) {
      event.preventDefault();
      this.saveMedicine(); // Changed from onSubmit() to saveMedicine()
    }
    if (event.key === 'Escape') {
      if (this.showDialog) this.showDialog = false;
      else if (this.showDetailsDialog) this.showDetailsDialog = false;
      else if (this.showQuickAddDialog) this.showQuickAddDialog = false;
      else if (this.searchText) this.clearSearch();
    }
    if (event.key === '/' && !this.showDialog && !this.showDetailsDialog && !this.showQuickAddDialog) {
      const activeElement = document.activeElement;
      if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault();
        this.searchInput.nativeElement.focus();
      }
    }
  }

  constructor(
    private medicineService: MedicineService,
    private categoryService: CategoryService,
    private genericService: GenericService,
    private uomService: UomService,
    private manufacturerService: ManufacturerService,
    private dosageFormService: DosageFormService,
    private strengthService: CommonStrengthService,
    private useForService: UseForService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private auth: AuthService
  ) {
    this.medicineForm = this.fb.group({
      medicineId: [0],
      code: [''], // Auto-generated
      name: ['', [Validators.required, Validators.minLength(3)]],
      genericName: [''],
      category: [''],
      uom: ['', Validators.required],
      purchasePrice: [0, [Validators.min(0)]],
      salePrice: [0, [Validators.required, Validators.min(0)]],
      stockQuantity: [0, [Validators.min(0)]],
      batch: [''],
      expiryDate: [null],
      manufacturer: [''],
      dosageForm: [''],
      strength: [''],
      useFor: [''],
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

    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 500);
  }

  // Getter for easy access to form controls in the template
  get f() { return this.medicineForm.controls; }

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
    this.manufacturerService.getAll().subscribe(data => this.manufacturers = data);
    this.dosageFormService.getAll().subscribe(data => this.dosageForms = data);
    this.strengthService.getAll().subscribe(data => this.strengths = data);
    this.useForService.getAll().subscribe(data => this.useFors = data);
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
    setTimeout(() => {
      this.brandNameInput?.nativeElement?.focus();
    }, 150);
  }

  openEdit(med: Medicine) {
    this.editMode = true;
    this.medicineForm.patchValue({
      ...med
    });
    this.showDialog = true;
    setTimeout(() => {
      this.brandNameInput?.nativeElement?.focus();
    }, 150);
  }

  viewDetails(med: Medicine) {
    // Fetch full data with batches from backend
    this.medicineService.getMedicine(med.medicineId).subscribe({
      next: (fullMed) => {
        this.selectedMedicine.set(fullMed);
        this.showDetailsDialog = true;
      },
      error: () => {
        // Fallback to list data if API fails
        this.selectedMedicine.set(med);
        this.showDetailsDialog = true;
      }
    });
  }


  onEnter(nextEl: any) {
    if (nextEl) {
      if (nextEl.focusInput) nextEl.focusInput(); // For PrimeNG components
      else if (nextEl.focus) nextEl.focus();
      else if (nextEl.element?.focus) nextEl.element.focus();
    }
  }

  saveMedicine() {
    if (this.medicineForm.invalid) {
      this.medicineForm.markAllAsTouched(); // Mark all fields as touched to show validation errors
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill in all required fields.' });
      return;
    }

    this.saving = true;
    const medicineData = { ...this.medicineForm.value };

    // Auto-fill optional fields with N/A or 0 for reporting consistency
    medicineData.genericName = medicineData.genericName || 'N/A';
    medicineData.category = medicineData.category || 'N/A';
    medicineData.manufacturer = medicineData.manufacturer || 'N/A';
    medicineData.dosageForm = medicineData.dosageForm || 'N/A';
    medicineData.strength = medicineData.strength || 'N/A';
    medicineData.useFor = medicineData.useFor || 'N/A';

    medicineData.purchasePrice = medicineData.purchasePrice ?? 0;
    medicineData.stockQuantity = medicineData.stockQuantity ?? 0;

    // Removing the code field if it's the placeholder for new items
    if (!this.editMode && (medicineData.code === 'AUTO-GENERATE' || medicineData.code === 'FETCHING...')) {
      delete medicineData.code;
    }

    const obs = this.editMode
      ? this.medicineService.updateMedicine(medicineData.medicineId, medicineData)
      : this.medicineService.createMedicine(medicineData);

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

  toggleStatus(med: Medicine) {
    this.medicineService.toggleStatus(med.medicineId).subscribe({
      next: (res) => {
        med.isActive = res.isActive;
        this.messageService.add({
          severity: res.isActive ? 'success' : 'warn',
          summary: 'Status Updated',
          detail: `${med.name} is now ${res.isActive ? 'Active' : 'Inactive'}.`
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not update status.' });
      }
    });
  }

  isIncomplete(med: Medicine): boolean {
    return !med.genericName || med.genericName === 'N/A' ||
      !med.category || med.category === 'N/A' ||
      !med.manufacturer || med.manufacturer === 'N/A' ||
      !med.dosageForm || med.dosageForm === 'N/A' ||
      !med.strength || med.strength === 'N/A' ||
      !med.useFor || med.useFor === 'N/A';
  }

  isExpired(date: any): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  // ─── Quick Add Methods ───
  openQuickAdd(type: string) {
    this.quickAddType = type;
    this.quickAddName = '';
    this.quickAddTitle = `Add New ${type}`;
    this.showQuickAddDialog = true;

    setTimeout(() => {
      const el = document.getElementById('quickAddInput') as HTMLElement;
      if (el) el.focus();
    }, 100);
  }

  saveQuickAdd() {
    if (!this.quickAddName || this.quickAddName.length < 2) return;

    this.quickAddSaving = true;
    const prefix = this.quickAddType.substring(0, 3).toUpperCase();

    // 1. Get Next Code
    let codeService: any;
    switch (this.quickAddType) {
      case 'Generic': codeService = this.genericService; break;
      case 'Manufacturer': codeService = this.manufacturerService; break;
      case 'Category': codeService = this.categoryService; break;
      case 'UOM': codeService = this.uomService; break;
      case 'Dosage Form': codeService = this.dosageFormService; break;
      case 'Strength': codeService = this.strengthService; break;
      case 'Use For': codeService = this.useForService; break;
    }

    if (!codeService) {
      this.quickAddSaving = false;
      return;
    }

    codeService.getNextCode(prefix).subscribe({
      next: (res: any) => {
        const newEntity: any = {
          code: res.code,
          name: this.quickAddName,
          isActive: true
        };

        // 2. Create Entity
        codeService.create(newEntity).subscribe({
          next: (created: any) => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: `${this.quickAddType} added successfully.` });

            // 3. Refresh List & Auto-Select
            this.refreshAndSelect(this.quickAddType, created.name);

            this.quickAddSaving = false;
            this.showQuickAddDialog = false;
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to add ${this.quickAddType}.` });
            this.quickAddSaving = false;
          }
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate code.' });
        this.quickAddSaving = false;
      }
    });
  }

  private refreshAndSelect(type: string, name: string) {
    switch (type) {
      case 'Generic':
        this.genericService.getAll().subscribe(data => {
          this.generics = data;
          this.medicineForm.patchValue({ genericName: name });
        });
        break;
      case 'Manufacturer':
        this.manufacturerService.getAll().subscribe(data => {
          this.manufacturers = data;
          this.medicineForm.patchValue({ manufacturer: name });
        });
        break;
      case 'Category':
        this.categoryService.getAll().subscribe(data => {
          this.categories = data;
          this.medicineForm.patchValue({ category: name });
        });
        break;
      case 'UOM':
        this.uomService.getAll().subscribe(data => {
          this.uoms = data;
          this.medicineForm.patchValue({ uom: name });
        });
        break;
      case 'Dosage Form':
        this.dosageFormService.getAll().subscribe(data => {
          this.dosageForms = data;
          this.medicineForm.patchValue({ dosageForm: name });
        });
        break;
      case 'Strength':
        this.strengthService.getAll().subscribe(data => {
          this.strengths = data;
          this.medicineForm.patchValue({ strength: name });
        });
        break;
      case 'Use For':
        this.useForService.getAll().subscribe(data => {
          this.useFors = data;
          this.medicineForm.patchValue({ useFor: name });
        });
        break;
    }
  }

  hasPermission(mod: string, act: 'view' | 'create' | 'edit' | 'delete' = 'view') {
    return this.auth.hasPermission(mod, act);
  }

  isSystemAdmin() {
    return this.auth.isSystemAdmin();
  }
}
