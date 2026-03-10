import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Medicine, MedicineService } from '../../services/medicine.service';
import { SalesService } from '../../services/sales.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-sales-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, DropdownModule, CalendarModule, CardModule],
  template: `
    <div class="flex flex-col lg:flex-row gap-6 p-6 w-full max-w-7xl mx-auto animate-fadein">
      <!-- Left: POS Entry -->
      <div class="flex-grow bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 border-l-[12px] border-l-teal-600">
        <h2 class="text-3xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <span class="pi pi-desktop text-3xl text-teal-600"></span> Point of Sale (POS)
        </h2>

        <form [formGroup]="salesForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="font-bold text-slate-600">Customer Name</label>
              <input pInputText formControlName="customerName" placeholder="Guest Customer" class="w-full">
            </div>
            <div class="flex flex-col gap-2">
              <label class="font-bold text-slate-600">Phone</label>
              <input pInputText formControlName="customerPhone" placeholder="01XXX-XXXXXX" class="w-full">
            </div>
          </div>

          <div class="border-t border-slate-100 pt-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-slate-800">Medicines</h3>
              <button type="button" pButton icon="pi pi-plus" label="Add" (click)="addItem()" class="p-button-sm p-button-info"></button>
            </div>

            <div formArrayName="salesDetails" class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              <div *ngFor="let item of salesDetails.controls; let i=index" [formGroupName]="i" 
                   class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                
                <div class="md:col-span-2 flex flex-col gap-1">
                  <label class="text-xs font-bold text-slate-400">Medicine</label>
                  <p-dropdown [options]="medicines" formControlName="medicineId" optionLabel="name" optionValue="medicineId" 
                              placeholder="Select Item" filter="true" styleClass="w-full" (onChange)="onMedicineChange(i)"></p-dropdown>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-slate-400">Qty</label>
                  <input pInputText type="number" formControlName="quantity" (input)="itemTotal(i)" class="w-full">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-slate-400">Price</label>
                  <input pInputText type="number" formControlName="unitPrice" [readonly]="true" class="bg-slate-200 w-full text-slate-700 font-semibold">
                </div>

                <div class="flex gap-2 items-center justify-end pb-1">
                  <div class="font-bold text-teal-700 w-24 text-right pr-2">{{ item.get('subtotal')?.value | currency }}</div>
                  <button type="button" pButton icon="pi pi-times" (click)="removeItem(i)" class="p-button-danger p-button-text p-button-rounded"></button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Right: Summary & Checkout -->
      <div class="w-full lg:w-96 space-y-6">
        <div class="bg-teal-800 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
          <div class="absolute -right-4 -top-4 text-white/5 text-9xl pi pi-wallet"></div>
          <h3 class="text-xl font-bold mb-4 uppercase tracking-widest text-teal-300">Order Summary</h3>
          
          <div class="space-y-3 mb-8">
            <div class="flex justify-between text-lg">
              <span class="text-teal-100">Subtotal:</span>
              <span class="font-semibold">{{ subtotal | currency }}</span>
            </div>
            <div class="flex justify-between text-lg">
              <span class="text-teal-100">Tax (5%):</span>
              <span class="font-semibold">{{ taxTotal | currency }}</span>
            </div>
            <div class="flex justify-between text-lg items-center mt-2">
              <span class="text-teal-100">Discount:</span>
              <div class="w-24">
                <input pInputText type="number" [formControl]="salesForm.controls.discount" 
                       class="text-right p-2 text-slate-800 font-bold w-full rounded-lg" (input)="updateTotals()">
              </div>
            </div>
          </div>

          <div class="border-t border-teal-600 pt-6 mb-8 mt-4">
            <div class="text-sm font-bold text-teal-200 uppercase tracking-wide mb-1">Payable Amount</div>
            <div class="text-5xl font-black text-white">{{ grandTotal | currency }}</div>
          </div>

          <div class="space-y-4">
            <p-dropdown [options]="['Cash', 'Card', 'Mobile']" formControlName="paymentMethod" 
                        placeholder="Payment Method" styleClass="w-full"></p-dropdown>
            <button pButton label="Complete Sale" icon="pi pi-check-circle" 
                    class="p-button-lg bg-teal-500 hover:bg-teal-600 border-none w-full font-black text-xl py-4 transition-colors"
                    (click)="onSubmit()" [disabled]="salesForm.invalid"></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { width: 100%; display: flex; justify-content: center; background-color: #F8FAFC; min-height: 100vh; }
    ::ng-deep .p-dropdown { border-radius: 12px; }
    ::ng-deep .p-inputtext { border-radius: 12px; }
  `]
})
export class SalesFormComponent implements OnInit {
  salesForm: FormGroup;
  medicines: Medicine[] = [];
  subtotal = 0;
  taxTotal = 0;
  grandTotal = 0;

  constructor(
    private fb: FormBuilder,
    private medicineService: MedicineService,
    private salesService: SalesService
  ) {
    this.salesForm = this.fb.group({
      customerName: ['Guest'],
      customerPhone: [''],
      saleDate: [new Date()],
      grandTotal: [0],
      discount: [0],
      paymentMethod: ['Cash', Validators.required],
      salesDetails: this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.medicineService.getMedicines().subscribe(data => this.medicines = data);
    this.addItem();
  }

  get salesDetails() {
    return this.salesForm.get('salesDetails') as FormArray;
  }

  addItem() {
    const item = this.fb.group({
      medicineId: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0],
      tax: [0],
      subtotal: [0]
    });
    this.salesDetails.push(item);
  }

  removeItem(index: number) {
    this.salesDetails.removeAt(index);
    this.updateTotals();
  }

  onMedicineChange(index: number) {
    const item = this.salesDetails.at(index);
    const medId = item.get('medicineId')?.value;
    const med = this.medicines.find(m => m.medicineId === medId);
    if (med) {
      item.patchValue({ unitPrice: med.price });
      this.itemTotal(index);
    }
  }

  itemTotal(index: number) {
    const item = this.salesDetails.at(index);
    const qty = item.get('quantity')?.value || 0;
    const price = item.get('unitPrice')?.value || 0;
    const total = qty * price;
    item.patchValue({ 
      tax: total * 0.05,
      subtotal: total
    });
    this.updateTotals();
  }

  updateTotals() {
    this.subtotal = this.salesDetails.controls.reduce((acc, curr) => acc + (curr.get('subtotal')?.value || 0), 0);
    this.taxTotal = this.salesDetails.controls.reduce((acc, curr) => acc + (curr.get('tax')?.value || 0), 0);
    const disc = this.salesForm.get('discount')?.value || 0;
    this.grandTotal = (this.subtotal + this.taxTotal) - disc;
    this.salesForm.patchValue({ grandTotal: this.grandTotal });
  }

  onSubmit() {
    if (this.salesForm.valid) {
      this.salesService.createSale(this.salesForm.value).subscribe({
        next: () => alert('Sale completed!'),
        error: (err) => alert(err.error || 'Error completing sale')
      });
    }
  }
}
