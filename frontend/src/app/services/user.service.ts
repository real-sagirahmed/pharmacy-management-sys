import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserDto {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  isActive: boolean;
  profilePicturePath?: string;
  roles: string[];
}

export interface RoleDto {
  id: string;
  name: string;
  userCount?: number;
}

export interface PermissionDto {
  id?: number;
  roleId: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/Users`;

  constructor(private http: HttpClient) { }

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(this.apiUrl);
  }

  createByAdmin(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-by-admin`, userData);
  }

  updateUser(id: string, user: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, user);
  }

  toggleStatus(userId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${userId}/toggle-status`, {});
  }

  updateRole(userId: string, newRole: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-role`, { userId, newRole });
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  changePassword(data: any): Observable<any> {
    // Auth endpoints are somewhat separate from Users endpoint, let's point to Auth/change-password natively
    return this.http.post(`${environment.apiUrl}/Auth/change-password`, data);
  }

  uploadProfilePicture(formData: FormData): Observable<any> {
    return this.http.post(`${environment.apiUrl}/Auth/upload-profile-picture`, formData);
  }

  // Role & Permission Management
  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${this.apiUrl}/roles`);
  }

  createRole(roleName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/roles`, JSON.stringify(roleName), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  updateRoleName(roleId: string, newName: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/roles/${roleId}`, JSON.stringify(newName), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  deleteRole(roleId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/roles/${roleId}`);
  }

  getPermissions(roleId: string): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${this.apiUrl}/permissions/${roleId}`);
  }

  updatePermissions(roleId: string, permissions: PermissionDto[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/permissions/${roleId}`, permissions);
  }
}
