import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Tax {
  taxId: number;
  code: string;
  name: string;
  taxRate: number;
  remarks?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class TaxService {
  private apiUrl = `${environment.apiUrl}/Taxes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Tax[]> {
    return this.http.get<Tax[]>(this.apiUrl);
  }

  getById(id: number): Observable<Tax> {
    return this.http.get<Tax>(`${this.apiUrl}/${id}`);
  }

  create(tax: Tax): Observable<Tax> {
    return this.http.post<Tax>(this.apiUrl, tax);
  }

  update(id: number, tax: Tax): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, tax);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getNextCode(prefix: string): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code/${prefix}`);
  }
}

