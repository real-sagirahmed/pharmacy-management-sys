import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Medicine {
  medicineId: number;
  code: string;
  name: string;
  genericName: string;
  category: string;
  uom: string;
  purchasePrice: number;
  salePrice: number;
  stockQuantity: number;
  batch?: string;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MedicineSearchParameters {
  searchText?: string;
  category?: string;
  genericName?: string;
  expiryFrom?: string;
  expiryTo?: string;
  pageNumber: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class MedicineService {
  private apiUrl = `${environment.apiUrl}/Medicines`;

  constructor(private http: HttpClient) { }

  getMedicines(params?: MedicineSearchParameters): Observable<PagedResult<Medicine>> {
    let url = this.apiUrl;
    if (params) {
      const query = Object.entries(params)
        .filter(([_, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      if (query) url += `?${query}`;
    }
    return this.http.get<PagedResult<Medicine>>(url);
  }

  getMedicine(id: number): Observable<Medicine> {
    return this.http.get<Medicine>(`${this.apiUrl}/${id}`);
  }

  createMedicine(medicine: Medicine): Observable<Medicine> {
    return this.http.post<Medicine>(this.apiUrl, medicine);
  }

  updateMedicine(id: number, medicine: Medicine): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, medicine);
  }

  getNextCode(): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code`);
  }

  deleteMedicine(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
