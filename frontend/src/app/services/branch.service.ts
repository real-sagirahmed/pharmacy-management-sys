import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BranchItem {
  branchId: number;
  tenantId: number;
  branchName: string;
  address?: string;
  phone?: string;
  drugLicenseNo?: string;
  isHeadOffice: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface BranchTransferItem {
  transferId: number;
  tenantId: number;
  transferCode: string;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  batchId?: number;
  batchNumber: string;
  medicineId: number;
  medicineName: string;
  quantity: number;
  status: string;
  transferDate: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private apiUrl = `${environment.apiUrl}/Branches`;

  constructor(private http: HttpClient) {}

  getBranches(tenantId?: number | null): Observable<BranchItem[]> {
    let params = new HttpParams();
    if (tenantId) params = params.set('tenantId', tenantId.toString());
    return this.http.get<BranchItem[]>(this.apiUrl, { params });
  }

  createBranch(dto: {
    tenantId?: number | null;
    branchName: string;
    address?: string;
    phone?: string;
    drugLicenseNo?: string;
    isHeadOffice?: boolean;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, dto);
  }

  updateBranch(id: number, dto: {
    branchName?: string;
    address?: string;
    phone?: string;
    drugLicenseNo?: string;
  }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto);
  }

  setStatus(id: number, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, isActive, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getTransfers(tenantId?: number | null): Observable<BranchTransferItem[]> {
    let params = new HttpParams();
    if (tenantId) params = params.set('tenantId', tenantId.toString());
    return this.http.get<BranchTransferItem[]>(`${this.apiUrl}/transfer`, { params });
  }

  requestTransfer(dto: {
    fromBranchId: number;
    toBranchId: number;
    batchId: number;
    quantity: number;
    remarks?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transfer`, dto);
  }

  approveTransfer(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/transfer/${id}/approve`, {});
  }

  rejectTransfer(id: number, remarks?: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/transfer/${id}/reject`, remarks ? { remarks } : {});
  }
}
