import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Customer {
  partyId: number;
  code: string;
  fullName: string;
  cell?: string;
  email?: string;
  address?: string;
  partyType: string;
  isActive: boolean;
  // UI helpers
  customerId?: number;
  mobile?: string;
  isRegistered?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private apiUrl = `${environment.apiUrl}/Parties`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.apiUrl).pipe(
      map(data => data.map(c => ({
        ...c,
        customerId: c.partyId,
        mobile: c.cell,
        isRegistered: true
      })))
    );
  }

  // Specialized search for customers in Sales form
  search(q: string): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/search`, { params: { q, type: 'Customer' } }).pipe(
      map(data => data.map(c => ({
        ...c,
        customerId: c.partyId,
        mobile: c.cell,
        isRegistered: true
      })))
    );
  }

  getById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${id}`).pipe(
      map(c => ({
        ...c,
        customerId: c.partyId,
        mobile: c.cell,
        isRegistered: true
      }))
    );
  }

  create(dto: any): Observable<Customer> {
    // Ensure it's created as a Customer type
    const payload = { ...dto, partyType: 'Customer' };
    return this.http.post<Customer>(this.apiUrl, payload).pipe(
      map(c => ({
        ...c,
        customerId: c.partyId,
        mobile: c.cell,
        isRegistered: true
      }))
    );
  }

  update(id: number, dto: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dto);
  }

  getNextCode(prefix: string = 'CUS'): Observable<{ code: string }> {
    return this.http.get<{ code: string }>(`${this.apiUrl}/next-code/${prefix}`);
  }
}
