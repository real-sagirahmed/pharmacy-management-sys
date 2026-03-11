import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="um-wrap animate-fadein-up">

      <!-- Page Header -->
      <div class="um-header">
        <div>
          <h1 class="um-title">User Management</h1>
          <p class="um-sub">Manage system users and their roles.</p>
        </div>
        <span class="admin-badge"><i class="pi pi-lock"></i> Admin Only</span>
      </div>

      <!-- Stats Row -->
      <div class="um-stats">
        <div class="stat-pill">
          <i class="pi pi-users"></i>
          <span>{{ users.length }} Users</span>
        </div>
        <div class="stat-pill stat-admin">
          <i class="pi pi-shield"></i>
          <span>{{ countRole('Admin') }} Admins</span>
        </div>
        <div class="stat-pill stat-manager">
          <i class="pi pi-briefcase"></i>
          <span>{{ countRole('Manager') }} Managers</span>
        </div>
        <div class="stat-pill stat-cashier">
          <i class="pi pi-receipt"></i>
          <span>{{ countRole('Cashier') }} Cashiers</span>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-row" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i> Loading users…
      </div>

      <!-- User Cards -->
      <div class="user-grid" *ngIf="!loading">
        <div class="user-card" *ngFor="let user of users">
          <div class="user-card-left">
            <div class="avatar" [style.background]="getAvatarColor(user.fullName)">
              {{ user.fullName?.charAt(0)?.toUpperCase() || '?' }}
            </div>
            <div class="user-info">
              <div class="user-name">{{ user.fullName }}</div>
              <div class="user-username">&#64;{{ user.userName }}</div>
              <div class="user-email">{{ user.email }}</div>
            </div>
          </div>
          <div class="user-card-right">
            <div class="roles-row">
              <span *ngFor="let role of user.roles" class="role-badge" [class]="getRoleBadgeClass(role)">
                {{ role }}
              </span>
            </div>
            <div class="actions-row">
              <select class="role-select" (change)="onRoleChange(user.id, $any($event.target).value)">
                <option value="" disabled selected>Change Role…</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Pharmacist">Pharmacist</option>
                <option value="Cashier">Cashier</option>
              </select>
              <button class="del-btn" (click)="onDelete(user.id)"
                      [disabled]="isCurrentUser(user.userName)" title="Delete user">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="users.length === 0">
          <i class="pi pi-users empty-icon"></i>
          <p>No users found.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .um-wrap { display: flex; flex-direction: column; gap: 20px; width: 100%; }

    /* Header */
    .um-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .um-title  { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .um-sub    { font-size: .875rem; color: #64748b; margin: 0; }
    .admin-badge {
      display: flex; align-items: center; gap: 6px;
      background: #ede9fe; color: #7c3aed; padding: 6px 14px;
      border-radius: 99px; font-size: .75rem; font-weight: 700; border: 1px solid #ddd6fe;
    }

    /* Stats */
    .um-stats  { display: flex; gap: 10px; flex-wrap: wrap; }
    .stat-pill {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 99px;
      font-size: .8rem; font-weight: 600;
      background: #f1f5f9; color: #475569;
    }
    .stat-admin   { background: #ede9fe; color: #7c3aed; }
    .stat-manager { background: #dbeafe; color: #1d4ed8; }
    .stat-cashier { background: #dcfce7; color: #15803d; }

    .loading-row { color: #64748b; font-size: .875rem; padding: 20px 0; display: flex; align-items: center; gap: 8px; }

    /* User Grid */
    .user-grid { display: flex; flex-direction: column; gap: 12px; }
    .user-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 18px 22px; display: flex; align-items: center;
      justify-content: space-between; gap: 16px; flex-wrap: wrap;
      transition: box-shadow .15s, border-color .15s;
    }
    .user-card:hover { box-shadow: 0 4px 12px -2px rgba(0,0,0,.08); border-color: #cbd5e1; }

    .user-card-left  { display: flex; align-items: center; gap: 14px; }
    .user-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }

    /* Avatar */
    .avatar {
      width: 44px; height: 44px; border-radius: 12px;
      color: #fff; font-size: 1.1rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .user-info { display: flex; flex-direction: column; gap: 2px; }
    .user-name     { font-size: .95rem; font-weight: 700; color: #0f172a; }
    .user-username { font-size: .78rem; color: #64748b; }
    .user-email    { font-size: .8rem; color: #94a3b8; }

    /* Role Badges */
    .roles-row { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .role-badge {
      padding: 3px 10px; border-radius: 99px;
      font-size: .7rem; font-weight: 700; letter-spacing: .04em;
    }
    .role-admin     { background: #ede9fe; color: #7c3aed; }
    .role-manager   { background: #dbeafe; color: #1d4ed8; }
    .role-pharmacist{ background: #ccfbf1; color: #0f766e; }
    .role-cashier   { background: #dcfce7; color: #15803d; }
    .role-default   { background: #f1f5f9; color: #475569; }

    /* Actions */
    .actions-row { display: flex; align-items: center; gap: 8px; }
    .role-select {
      padding: 7px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
      font-size: .8rem; font-family: 'Inter', sans-serif; color: #334155;
      background: #f8fafc; outline: none; cursor: pointer;
    }
    .role-select:focus { border-color: #0d9488; }
    .del-btn {
      width: 34px; height: 34px; border: none; border-radius: 8px;
      background: #fff1f2; color: #f87171; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .del-btn:hover:not(:disabled) { background: #ffe4e6; color: #ef4444; }
    .del-btn:disabled { opacity: .35; cursor: not-allowed; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 48px 20px; color: #94a3b8;
    }
    .empty-icon { font-size: 3rem; }
  `]
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  loading = false;

  private avatarColors = ['#0d9488','#6366f1','#f59e0b','#10b981','#ec4899','#3b82f6','#a855f7'];

  constructor(private userService: UserService, private authService: AuthService) {}

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next:  (data) => { this.users = data; this.loading = false; },
      error: (err)  => { console.error('Failed to load users', err); this.loading = false; }
    });
  }

  getAvatarColor(name: string): string {
    const idx = (name?.charCodeAt(0) || 0) % this.avatarColors.length;
    return this.avatarColors[idx];
  }

  getRoleBadgeClass(role: string): string {
    switch (role?.toLowerCase()) {
      case 'admin':      return 'role-badge role-admin';
      case 'manager':    return 'role-badge role-manager';
      case 'pharmacist': return 'role-badge role-pharmacist';
      case 'cashier':    return 'role-badge role-cashier';
      default:           return 'role-badge role-default';
    }
  }

  countRole(role: string): number {
    return this.users.filter(u => u.roles?.includes(role)).length;
  }

  isCurrentUser(username: string): boolean {
    return this.authService.currentUserValue?.userName === username;
  }

  onRoleChange(userId: string, newRole: string) {
    if (!newRole) return;
    if (confirm(`Change this user's role to ${newRole}?`)) {
      this.userService.updateRole(userId, newRole).subscribe({
        next: () => this.loadUsers(),
        error: () => alert('Failed to update role')
      });
    }
  }

  onDelete(userId: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => this.loadUsers(),
        error: () => alert('Failed to delete user')
      });
    }
  }
}
