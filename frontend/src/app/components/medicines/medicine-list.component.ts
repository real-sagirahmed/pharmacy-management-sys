import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Medicine, MedicineService } from '../../services/medicine.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-medicine-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, TagModule],
  template: `
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-6xl animate-fadein">
      <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
        <h2 class="text-2xl font-bold text-slate-800">Medicine Inventory</h2>
        <button pButton label="Add Medicine" icon="pi pi-plus" class="p-button-success"></button>
      </div>

      <p-table [value]="medicines" [paginator]="true" [rows]="10" [responsiveLayout]="'scroll'"
               styleClass="p-datatable-gridlines p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>Name</th>
            <th>Generic Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Expiry</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-medicine>
          <tr>
            <td class="font-semibold">{{medicine.name}}</td>
            <td>{{medicine.genericName}}</td>
            <td>{{medicine.category}}</td>
            <td>{{medicine.price | currency}}</td>
            <td>
              <p-tag [value]="medicine.stockQuantity" 
                     [severity]="medicine.stockQuantity < 10 ? 'danger' : 'success'"></p-tag>
            </td>
            <td>{{medicine.expiryDate | date}}</td>
            <td>
              <p-tag [value]="medicine.isActive ? 'Active' : 'Inactive'" 
                     [severity]="medicine.isActive ? 'success' : 'secondary'"></p-tag>
            </td>
            <td>
              <div class="flex gap-2">
                <button pButton icon="pi pi-pencil" class="p-button-rounded p-button-info p-button-text"></button>
                <button pButton icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-text"></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    :host { width: 100%; display: flex; justify-content: center; }
  `]
})
export class MedicineListComponent implements OnInit {
  medicines: Medicine[] = [];

  constructor(private medicineService: MedicineService) {}

  ngOnInit() {
    this.medicineService.getMedicines().subscribe(data => {
      this.medicines = data;
    });
  }
}
