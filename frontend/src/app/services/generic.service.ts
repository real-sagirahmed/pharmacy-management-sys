import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Generic {
  genericId: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class GenericService {
  private apiUrl = `${environment.apiUrl}/Generics`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Generic[]> {
    return this.http.get<Generic[]>(this.apiUrl);
  }

  getById(id: number): Observable<Generic> {
    return this.http.get<Generic>(`${this.apiUrl}/${id}`);
  }

  create(generic: Generic): Observable<Generic> {
    return this.http.post<Generic>(this.apiUrl, generic);
  }

  update(id: number, generic: Generic): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, generic);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getNextCode(prefix: string): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code/${prefix}`);
  }
}

