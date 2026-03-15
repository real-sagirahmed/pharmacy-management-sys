import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UseFor {
  useForId: number;
  code: string;
  name: string;
  remarks?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class UseForService {
  private apiUrl = `${environment.apiUrl}/UseFor`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UseFor[]> {
    return this.http.get<UseFor[]>(this.apiUrl);
  }

  getById(id: number): Observable<UseFor> {
    return this.http.get<UseFor>(`${this.apiUrl}/${id}`);
  }

  create(useFor: UseFor): Observable<UseFor> {
    return this.http.post<UseFor>(this.apiUrl, useFor);
  }

  update(id: number, useFor: UseFor): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, useFor);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getNextCode(prefix: string): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code/${prefix}`);
  }
}
