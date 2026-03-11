import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Medicine, MedicineService } from '../../services/medicine.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-medicine-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, TagModule, DialogModule],
  template: `
    <div class="page-wrap animate-fadein-up">

      <!-- ─── Page Header ─── -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Medicine Inventory</h1>
          <p class="page-sub">Manage your medicines, stock levels and expiry dates.</p>
        </div>
        <button class="btn-primary" (click)="showDialog = true">
          <i class="pi pi-plus"></i> Add Medicine
        </button>
      </div>

      <!-- ─── Summary Chips ─── -->
      <div class="summary-row">
        <div class="chip chip-teal">
          <i class="pi pi-box"></i>
          <span>{{ medicines().length }} Total</span>
        </div>
        <div class="chip chip-green">
          <i class="pi pi-check-circle"></i>
          <span>{{ activeMedicines() }} Active</span>
        </div>
        <div class="chip chip-amber">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ lowStock() }} Low Stock</span>
        </div>
        <div class="chip chip-red">
          <i class="pi pi-times-circle"></i>
          <span>{{ expiredCount() }} Expired</span>
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
                   placeholder="Search by name, generic name or category…"/>
            <button *ngIf="searchText" class="search-clear" (click)="searchText=''">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <span class="result-count">{{ filteredMedicines().length }} results</span>
        </div>

        <!-- Table -->
        <p-table [value]="filteredMedicines()" [paginator]="true" [rows]="10"
                 [responsiveLayout]="'scroll'"
                 styleClass="p-datatable-sm"
                 [rowHover]="true"
                 emptyMessage="No medicines found.">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
              <th pSortableColumn="genericName">Generic Name <p-sortIcon field="genericName"></p-sortIcon></th>
              <th pSortableColumn="category">Category <p-sortIcon field="category"></p-sortIcon></th>
              <th pSortableColumn="price">Price <p-sortIcon field="price"></p-sortIcon></th>
              <th pSortableColumn="stockQuantity">Stock <p-sortIcon field="stockQuantity"></p-sortIcon></th>
              <th pSortableColumn="expiryDate">Expiry <p-sortIcon field="expiryDate"></p-sortIcon></th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-medicine>
            <tr>
              <td>
                <div class="med-name">{{ medicine.name }}</div>
              </td>
              <td class="text-muted">{{ medicine.genericName }}</td>
              <td>
                <span class="badge badge-slate">{{ medicine.category }}</span>
              </td>
              <td class="font-semibold">{{ medicine.price | currency }}</td>
              <td>
                <span class="stock-badge"
                      [class.stock-low]="medicine.stockQuantity < 10"
                      [class.stock-ok]="medicine.stockQuantity >= 10">
                  <i class="pi" [class.pi-exclamation-triangle]="medicine.stockQuantity < 10"
                                [class.pi-check-circle]="medicine.stockQuantity >= 10"></i>
                  {{ medicine.stockQuantity }}
                </span>
              </td>
              <td>
                <span [class.expiry-warn]="isExpiringSoon(medicine.expiryDate)"
                      [class.expiry-expired]="isExpired(medicine.expiryDate)">
                  {{ medicine.expiryDate | date:'MMM d, y' }}
                </span>
              </td>
              <td>
                <p-tag [value]="medicine.isActive ? 'Active' : 'Inactive'"
                       [severity]="medicine.isActive ? 'success' : 'secondary'"></p-tag>
              </td>
              <td>
                <div class="action-btns">
                  <button class="act-btn act-edit" title="Edit">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="act-btn act-del" title="Delete">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8">
                <div class="empty-state">
                  <i class="pi pi-inbox empty-icon"></i>
                  <p class="empty-text">No medicines found</p>
                  <p class="empty-sub">Try adjusting your search or add a new medicine</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- ─── Add Medicine Dialog (placeholder) ─── -->
      <p-dialog header="Add New Medicine" [(visible)]="showDialog" [modal]="true"
                [style]="{width:'480px'}" [closable]="true">
        <p style="color:#64748b;font-size:.875rem">Medicine form goes here.</p>
        <ng-template pTemplate="footer">
          <button class="btn-secondary" (click)="showDialog=false">Cancel</button>
          <button class="btn-primary" (click)="showDialog=false">Save</button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .page-wrap {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    /* Header */
    .page-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .page-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub   { font-size: .875rem; color: #64748b; margin: 0; }

    /* Buttons */
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
    .btn-primary:hover { background: #0f766e; }
    .btn-secondary {
      display: flex; align-items: center; gap: 8px;
      background: #f1f5f9; color: #334155;
      border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 10px 18px;
      font-size: .875rem; font-weight: 600;
      cursor: pointer; font-family: 'Inter', sans-serif;
    }

    /* Summary Chips */
    .summary-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 99px;
      font-size: .8rem; font-weight: 600;
    }
    .chip-teal   { background: #ccfbf1; color: #0f766e; }
    .chip-green  { background: #dcfce7; color: #15803d; }
    .chip-amber  { background: #fef3c7; color: #b45309; }
    .chip-red    { background: #fee2e2; color: #b91c1c; }

    /* Table Card */
    .table-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
    }

    /* Toolbar */
    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      gap: 12px;
      flex-wrap: wrap;
    }
    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 400px;
    }
    .search-icon {
      position: absolute; left: 12px;
      color: #94a3b8; font-size: .875rem; pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 9px 36px 9px 36px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: .875rem;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color .15s;
      background: #f8fafc;
      color: #0f172a;
    }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear {
      position: absolute; right: 10px;
      background: none; border: none;
      color: #94a3b8; cursor: pointer; font-size: .875rem;
    }
    .result-count { font-size: .8rem; color: #94a3b8; white-space: nowrap; }

    /* Table cells */
    .med-name { font-weight: 600; color: #0f172a; }
    .text-muted { color: #64748b; font-size: .875rem; }
    .font-semibold { font-weight: 600; }

    /* Stock Badge */
    .stock-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 99px;
      font-size: .75rem; font-weight: 600;
    }
    .stock-low  { background: #fee2e2; color: #b91c1c; }
    .stock-ok   { background: #dcfce7; color: #15803d; }

    /* Expiry */
    .expiry-warn    { color: #d97706; font-weight: 600; }
    .expiry-expired { color: #dc2626; font-weight: 600; }

    /* Action Buttons */
    .action-btns { display: flex; gap: 4px; }
    .act-btn {
      width: 32px; height: 32px;
      border: none; border-radius: 8px;
      cursor: pointer; transition: background .15s;
      display: flex; align-items: center; justify-content: center;
      font-size: .875rem;
    }
    .act-edit { background: #eff6ff; color: #3b82f6; }
    .act-edit:hover { background: #dbeafe; }
    .act-del  { background: #fff1f2; color: #f43f5e; }
    .act-del:hover  { background: #ffe4e6; }

    /* Empty State */
    .empty-state {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 48px 20px; gap: 8px;
    }
    .empty-icon { font-size: 3rem; color: #cbd5e1; }
    .empty-text { font-size: 1rem; font-weight: 600; color: #334155; margin: 0; }
    .empty-sub  { font-size: .8rem; color: #94a3b8; margin: 0; }

    /* Badge */
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: .72rem; font-weight: 600; }
    .badge-slate { background: #f1f5f9; color: #475569; }
  `]
})
export class MedicineListComponent implements OnInit {
  medicinesData: Medicine[] = [];
  searchText = '';
  showDialog = false;
  today = new Date();

  medicines = signal<Medicine[]>([]);

  filteredMedicines = computed(() => {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.medicines();
    return this.medicines().filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.genericName?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q)
    );
  });

  activeMedicines = computed(() => this.medicines().filter(m => m.isActive).length);
  lowStock       = computed(() => this.medicines().filter(m => m.stockQuantity < 10).length);
  expiredCount   = computed(() => this.medicines().filter(m => this.isExpired(m.expiryDate)).length);

  constructor(private medicineService: MedicineService) {}

  ngOnInit() {
    this.medicineService.getMedicines().subscribe(data => {
      this.medicines.set(data);
    });
  }

  isExpiringSoon(date: string): boolean {
    if (!date) return false;
    const exp = new Date(date);
    const diff = (exp.getTime() - this.today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  }

  isExpired(date: string): boolean {
    if (!date) return false;
    return new Date(date) < this.today;
  }
}
