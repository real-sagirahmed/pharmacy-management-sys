import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Party {
  partyId: number;
  code: string;
  partyType: string; // 'Customer' | 'Supplier'
  fullName: string;
  cell?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class PartyService {
  private apiUrl = `${environment.apiUrl}/Parties`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Party[]> {
    return this.http.get<Party[]>(this.apiUrl);
  }

  getById(id: number): Observable<Party> {
    return this.http.get<Party>(`${this.apiUrl}/${id}`);
  }

  create(party: Party): Observable<Party> {
    return this.http.post<Party>(this.apiUrl, party);
  }

  update(id: number, party: Party): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, party);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getNextCode(prefix: string): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code/${prefix}`);
  }
}

