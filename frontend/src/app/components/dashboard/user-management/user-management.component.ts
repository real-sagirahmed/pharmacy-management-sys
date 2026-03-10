import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-800">User Management</h2>
        <span class="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-teal-400">Admin Only</span>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs">
            <tr>
              <th class="px-6 py-4">Name</th>
              <th class="px-6 py-4">Username</th>
              <th class="px-6 py-4">Email</th>
              <th class="px-6 py-4">Roles</th>
              <th class="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr *ngFor="let user of users" class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900">{{user.fullName}}</div>
              </td>
              <td class="px-6 py-4 text-slate-600">{{user.userName}}</td>
              <td class="px-6 py-4 text-slate-600">{{user.email}}</td>
              <td class="px-6 py-4">
                <div class="flex gap-1 flex-wrap">
                  <span *ngFor="let role of user.roles" 
                        [ngClass]="getRoleClass(role)"
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {{role}}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                  <select (change)="onRoleChange(user.id, $any($event.target).value)" 
                          class="text-xs bg-slate-100 border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500">
                    <option value="" disabled selected>Change Role</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                  </select>
                  <button (click)="onDelete(user.id)" 
                          [disabled]="isCurrentUser(user.userName)"
                          class="text-red-500 hover:text-red-700 disabled:opacity-30 transition-colors">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div *ngIf="users.length === 0" class="p-12 text-center text-slate-400">
          <i class="pi pi-users text-4xl mb-2"></i>
          <p>No users found.</p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  loading = false;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.loading = false;
      }
    });
  }

  getRoleClass(role: string) {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Manager': return 'bg-blue-100 text-blue-700 border border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }

  isCurrentUser(username: string): boolean {
    return this.authService.currentUserValue.userName === username;
  }

  onRoleChange(userId: string, newRole: string) {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      this.userService.updateRole(userId, newRole).subscribe({
        next: () => this.loadUsers(),
        error: (err) => alert('Failed to update role')
      });
    }
  }

  onDelete(userId: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => this.loadUsers(),
        error: (err) => alert('Failed to delete user')
      });
    }
  }
}
