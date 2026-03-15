import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Manufacturer {
  manufacturerId: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ManufacturerService {
  private apiUrl = `${environment.apiUrl}/Manufacturers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Manufacturer[]> {
    return this.http.get<Manufacturer[]>(this.apiUrl);
  }

  getById(id: number): Observable<Manufacturer> {
    return this.http.get<Manufacturer>(`${this.apiUrl}/${id}`);
  }

  create(manufacturer: Manufacturer): Observable<Manufacturer> {
    return this.http.post<Manufacturer>(this.apiUrl, manufacturer);
  }

  update(id: number, manufacturer: Manufacturer): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, manufacturer);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getNextCode(prefix: string): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code/${prefix}`);
  }
}
