import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Medicine, MedicineService } from '../../services/medicine.service';
import { Supplier, SupplierService } from '../../services/supplier.service';
import { PurchaseService } from '../../services/purchase.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, DropdownModule, CalendarModule, TableModule],
  template: `
    <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-5xl animate-fadein">
      <h2 class="text-3xl font-bold text-slate-800 mb-8 pb-4 border-b border-slate-100 flex items-center gap-3">
        <span class="pi pi-cart-plus text-3xl text-teal-600"></span> New Purchase Order
      </h2>

      <form [formGroup]="purchaseForm" (ngSubmit)="onSubmit()" class="space-y-8">
        <!-- Master Section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div class="flex flex-col gap-2">
            <label class="font-bold text-slate-700">Supplier</label>
            <p-dropdown [options]="suppliers" formControlName="supplierId" optionLabel="name" optionValue="supplierId" 
                        placeholder="Select Supplier" styleClass="w-full"></p-dropdown>
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-bold text-slate-700">Invoice #</label>
            <input pInputText formControlName="invoiceNumber" placeholder="INV-000" class="w-full">
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-bold text-slate-700">Date</label>
            <p-calendar formControlName="purchaseDate" [showIcon]="true" styleClass="w-full"></p-calendar>
          </div>
        </div>

        <!-- Details Section -->
        <div class="bg-white p-6 rounded-xl border border-slate-200">
          <div class="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
            <h3 class="text-xl font-bold text-slate-800">Medicines (Details)</h3>
            <button type="button" pButton label="Add Item" icon="pi pi-plus" (click)="addItem()" class="p-button-outlined p-button-sm p-button-info"></button>
          </div>

          <div formArrayName="purchaseDetails" class="space-y-4">
            <div *ngFor="let item of purchaseDetails.controls; let i=index" [formGroupName]="i" 
                 class="grid grid-cols-1 md:grid-cols-6 gap-4 items-end border-b border-slate-100 pb-4 last:border-0">
              
              <div class="md:col-span-2 flex flex-col gap-2">
                <label class="text-sm font-bold text-slate-500">Medicine</label>
                <p-dropdown [options]="medicines" formControlName="medicineId" optionLabel="name" optionValue="medicineId" 
                            placeholder="Select Medicine" styleClass="w-full" (onChange)="onMedicineChange(i)"></p-dropdown>
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-sm font-bold text-slate-500">Qty</label>
                <input pInputText type="number" formControlName="quantity" (input)="calculateSubtotal(i)" class="w-full">
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-sm font-bold text-slate-500">Cost</label>
                <input pInputText type="number" formControlName="unitCost" (input)="calculateSubtotal(i)" class="w-full">
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-sm font-bold text-slate-500">Subtotal</label>
                <input pInputText type="number" formControlName="subtotal" [readonly]="true" class="bg-slate-100 w-full text-slate-700 font-semibold text-right">
              </div>

              <div class="flex justify-center pb-1">
                <button type="button" pButton icon="pi pi-times" (click)="removeItem(i)" class="p-button-danger p-button-text p-button-rounded"></button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center bg-teal-800 p-6 rounded-xl text-white shadow-md">
          <div class="text-2xl md:text-3xl font-black">Grand Total: <span class="text-teal-200">{{ purchaseForm.value.totalAmount | currency }}</span></div>
          <button type="submit" pButton label="Save Purchase" icon="pi pi-check" [disabled]="purchaseForm.invalid" 
                  class="p-button-lg bg-teal-500 hover:bg-teal-600 border-none font-bold text-white px-8 md:px-12"></button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host { width: 100%; display: flex; justify-content: center; padding: 20px; }
  `]
})
export class PurchaseFormComponent implements OnInit {
  purchaseForm: FormGroup;
  medicines: Medicine[] = [];
  suppliers: Supplier[] = [];

  constructor(
    private fb: FormBuilder,
    private medicineService: MedicineService,
    private supplierService: SupplierService,
    private purchaseService: PurchaseService
  ) {
    this.purchaseForm = this.fb.group({
      supplierId: [null, Validators.required],
      invoiceNumber: ['', Validators.required],
      purchaseDate: [new Date(), Validators.required],
      totalAmount: [0],
      purchaseDetails: this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.medicineService.getMedicines().subscribe(data => this.medicines = data);
    this.supplierService.getSuppliers().subscribe(data => this.suppliers = data);
    this.addItem();
  }

  get purchaseDetails() {
    return this.purchaseForm.get('purchaseDetails') as FormArray;
  }

  addItem() {
    const item = this.fb.group({
      medicineId: [null, Validators.required],
      batchNumber: ['BATCH-NEW', Validators.required],
      expiryDate: [null],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitCost: [0, [Validators.required, Validators.min(0.01)]],
      subtotal: [0]
    });
    this.purchaseDetails.push(item);
  }

  removeItem(index: number) {
    this.purchaseDetails.removeAt(index);
    this.calculateGrandTotal();
  }

  onMedicineChange(index: number) {
    // Optional: auto-fill price or batch if needed
  }

  calculateSubtotal(index: number) {
    const item = this.purchaseDetails.at(index);
    const qty = item.get('quantity')?.value || 0;
    const cost = item.get('unitCost')?.value || 0;
    item.patchValue({ subtotal: qty * cost });
    this.calculateGrandTotal();
  }

  calculateGrandTotal() {
    const total = this.purchaseDetails.controls.reduce((acc, curr) => acc + (curr.get('subtotal')?.value || 0), 0);
    this.purchaseForm.patchValue({ totalAmount: total });
  }

  onSubmit() {
    if (this.purchaseForm.valid) {
      this.purchaseService.createPurchase(this.purchaseForm.value).subscribe({
        next: () => alert('Purchase saved successfully!'),
        error: () => alert('Error saving purchase.')
      });
    }
  }
}
