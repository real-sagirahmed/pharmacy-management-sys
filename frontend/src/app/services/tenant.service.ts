import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TenantListDto {
  tenantId: number;
  pharmacyName: string;
  email?: string;
  phone?: string;
  subscriptionPlan: string;
  subscriptionExpiry?: string | null;
  isActive: boolean;
  createdAt: string;
  branchCount: number;
}

export interface CreateTenantRequest {
  pharmacyName: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  drugLicenseNo?: string;
  invoiceFooter?: string;
  primaryColor?: string;
  subscriptionPlan?: string;
  subscriptionExpiry?: string | null;
  headOfficeBranchName?: string;
  adminFullName?: string;
  adminUserName?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminPhoneNumber?: string;
}

export interface UpdateTenantRequest {
  pharmacyName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  drugLicenseNo?: string;
  invoiceFooter?: string;
  primaryColor?: string;
  subscriptionPlan?: string;
  subscriptionExpiry?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = `${environment.apiUrl}/Tenants`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TenantListDto[]> {
    return this.http.get<TenantListDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateTenantRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateTenantRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto);
  }

  setStatus(id: number, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, isActive, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  uploadLogo(id: number, file: File): Observable<{ logoPath: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ logoPath: string }>(`${this.apiUrl}/${id}/logo`, fd);
  }
}
