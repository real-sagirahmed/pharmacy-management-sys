import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Uom {
  uomId: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class UomService {
  private apiUrl = `${environment.apiUrl}/Uoms`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Uom[]> {
    return this.http.get<Uom[]>(this.apiUrl);
  }

  getById(id: number): Observable<Uom> {
    return this.http.get<Uom>(`${this.apiUrl}/${id}`);
  }

  create(uom: Uom): Observable<Uom> {
    return this.http.post<Uom>(this.apiUrl, uom);
  }

  update(id: number, uom: Uom): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, uom);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getNextCode(prefix: string): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code/${prefix}`);
  }
}

