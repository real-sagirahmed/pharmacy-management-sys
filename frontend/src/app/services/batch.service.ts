import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MedicineBatchRecord {
  batchId: number;
  tenantId: number;
  branchId: number;
  branchName: string;
  medicineId: number;
  medicineName: string;
  medicineCode: string;
  batchNumber: string;
  expiryDate: string;
  isExpired: boolean;
  isNearExpiry: boolean;
  currentStock: number;
  purchasePrice: number;
  salePrice: number;
  status: 'Active' | 'Recalled' | 'Quarantined' | string;
  receivedAt: string;
  purchaseDetailId?: number | null;
  createdBy?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BatchService {
  private apiUrl = `${environment.apiUrl}/Batches`;

  constructor(private http: HttpClient) {}

  getBatches(filters?: {
    medicineId?: number;
    branchId?: number;
    status?: string;
    search?: string;
    tenantId?: number | null;
    includeZeroStock?: boolean;
  }): Observable<MedicineBatchRecord[]> {
    let params = new HttpParams();
    if (filters?.medicineId) params = params.set('medicineId', filters.medicineId.toString());
    if (filters?.branchId) params = params.set('branchId', filters.branchId.toString());
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.tenantId) params = params.set('tenantId', filters.tenantId.toString());
    if (filters?.includeZeroStock) params = params.set('includeZeroStock', 'true');
    return this.http.get<MedicineBatchRecord[]>(this.apiUrl, { params });
  }

  updateStatus(batchId: number, status: 'Active' | 'Recalled' | 'Quarantined'): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${batchId}/status`, { status });
  }
}
