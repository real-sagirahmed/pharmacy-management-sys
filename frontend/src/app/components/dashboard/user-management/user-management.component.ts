import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    InputTextModule, TagModule, ConfirmDialogModule, ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="page-wrap animate-fadein-up">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <!-- Sticky Header Area -->
      <div id="main-sticky-zone" class="sticky-header">
        <div class="page-head pt-2 pb-1 px-4">
          <div style="margin-left: 12px;">
            <h1 class="page-title">User Management</h1>
            <p class="page-sub text-xs">Manage system users and their roles.</p>
          </div>
          <span class="admin-badge"><i class="pi pi-lock"></i> Admin Only</span>
        </div>

        <!-- ─── Table Toolbar ─── -->
        <div class="table-toolbar px-4 py-2">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input type="text" pInputText [(ngModel)]="searchText" 
                   placeholder="Search by name, email, or username…" 
                   class="search-input">
            <button class="search-clear" *ngIf="searchText" (click)="searchText=''">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="flex items-center gap-4">
            <span class="result-count font-semibold">{{ filteredUsers().length }} results</span>
            <div class="summary-row">
              <div class="chip chip-slate"><i class="pi pi-users"></i> {{ users().length }} Total</div>
              <div class="chip chip-purple"><i class="pi pi-shield"></i> {{ countRole('Admin') }} Admins</div>
              <div class="chip chip-teal"><i class="pi pi-briefcase"></i> {{ countRole('Manager') }} Managers</div>
              <div class="chip chip-green"><i class="pi pi-receipt"></i> {{ countRole('Cashier') }} Cashiers</div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4">
        <div class="table-card">
          <!-- Table -->
          <div class="table-responsive">
            <p-table [value]="filteredUsers()" 
                     [paginator]="true" [rows]="10" 
                     [scrollable]="true" scrollHeight="calc(100vh - 230px)"
                     styleClass="p-datatable-sm" [rowHover]="true"
                     [loading]="loading()">
              <ng-template pTemplate="header">
                <tr>
                  <th style="min-width: 250px;" pSortableColumn="fullName">User Details <p-sortIcon field="fullName"></p-sortIcon></th>
                  <th style="min-width: 150px;">Roles</th>
                  <th style="min-width: 150px;">Change Role</th>
                  <th alignFrozen="right" pFrozenColumn style="min-width: 80px;">Actions</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-u>
                <tr>
                  <td>
                    <div class="user-card-inline">
                      <div class="avatar" [style.background]="getAvatarColor(u.fullName)">
                        {{ u.fullName?.charAt(0)?.toUpperCase() || '?' }}
                      </div>
                      <div class="user-info">
                        <div class="user-name med-name">{{ u.fullName }}</div>
                        <div class="user-username text-xs">&#64;{{ u.userName }} • <span class="text-muted">{{ u.email }}</span></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="roles-row">
                      <span *ngFor="let role of u.roles" class="role-badge" [class]="getRoleBadgeClass(role)">
                        {{ role }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <select class="role-select" (change)="onRoleChange(u.id, $any($event.target).value)">
                      <option value="" disabled selected>Change Role…</option>
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Pharmacist">Pharmacist</option>
                      <option value="Cashier">Cashier</option>
                    </select>
                  </td>
                  <td alignFrozen="right" pFrozenColumn>
                    <div class="action-btns">
                      <button class="act-btn act-del" title="Delete user" 
                              (click)="onDelete(u.id)"
                              [disabled]="isCurrentUser(u.userName)">
                        <i class="pi pi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4"><div class="empty-state"><i class="pi pi-users empty-icon"></i><p class="empty-text">No users found</p></div></td></tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .page-wrap { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; height: calc(100vh - 70px); }
    
    /* Sticky & Compact Header */
    .sticky-header {
      position: sticky; top: 0; z-index: 1000;
      background: #ffffff; border-bottom: 2px solid #e2e8f0;
      border-radius: 12px 12px 0 0;
    }
    .page-head { border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .page-title { font-size: 1.15rem !important; margin: 0; font-weight: 800; color: #1e293b; }
    .page-sub { margin: 0; color: #64748b; }
    .admin-badge {
      display: flex; align-items: center; gap: 6px; background: #ede9fe; color: #7c3aed; padding: 6px 14px;
      border-radius: 99px; font-size: .75rem; font-weight: 700; border: 1px solid #ddd6fe; margin-right: 12px;
    }
    
    .table-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    
    .summary-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: .8rem; font-weight: 600; }
    .chip-teal { background: #ccfbf1; color: #0f766e; } .chip-green { background: #dcfce7; color: #15803d; } .chip-slate { background: #f1f5f9; color: #475569; } .chip-purple { background: #ede9fe; color: #7c3aed; }
    
    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0 0 16px 16px; overflow: hidden; display: flex; flex-direction: column; }
    .search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: .875rem; pointer-events: none; }
    .search-input { width: 100%; padding: 9px 36px; height: 34px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px !important; font-family: 'Inter', sans-serif; outline: none; transition: border-color .15s; background: #f8fafc; color: #0f172a; }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: .875rem; }
    .result-count { font-size: .8rem; color: #94a3b8; }
    
    .table-responsive { overflow-x: auto; width: 100%; }
    .med-name { font-weight: 600; color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    
    /* Table Header Styling */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background-color: #f8fafc !important; color: #0d9488 !important; font-weight: 700 !important; font-size: 0.75rem !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; padding: 8px 10px !important; border-bottom: 2px solid #0d9488 !important;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td { padding: 6px 10px !important; border-bottom: 1px solid #f1f5f9; }
    
    /* Avatar & Inline Card */
    .user-card-inline { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 36px; height: 36px; border-radius: 10px;
      color: #fff; font-size: 1rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .user-info { display: flex; flex-direction: column; }
    .user-username { font-weight: 600; color: #475569; }

    /* Role Badges */
    .roles-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .role-badge {
      padding: 3px 8px; border-radius: 6px; display: inline-block;
      font-size: .7rem; font-weight: 700; letter-spacing: .02em;
    }
    .role-admin     { background: #ede9fe; color: #7c3aed; border: 1px solid #ddd6fe; }
    .role-manager   { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .role-pharmacist{ background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; }
    .role-cashier   { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .role-default   { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    /* Role Select */
    .role-select {
      padding: 6px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px;
      font-size: .75rem; font-family: 'Inter', sans-serif; color: #334155; font-weight: 600;
      background: #f8fafc; outline: none; cursor: pointer; transition: border-color .15s;
    }
    .role-select:focus { border-color: #0d9488; background: #fff; }
    
    .action-btns { display: flex; gap: 4px; }
    .act-btn { width: 30px; height: 30px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .1s; }
    .act-btn:hover:not(:disabled) { transform: scale(1.1); }
    .act-del  { background: #fff1f2; color: #f43f5e; }
    .act-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; gap: 8px; }
    .empty-icon { font-size: 3rem; color: #cbd5e1; } .empty-text { font-size: 1rem; font-weight: 600; color: #334155; margin: 0; }
  `]
})
export class UserManagementComponent implements OnInit {
  users = signal<any[]>([]);
  searchText = '';
  loading = signal(false);

  filteredUsers = computed(() => {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u => 
      u.fullName?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) ||
      u.userName?.toLowerCase().includes(q)
    );
  });

  private avatarColors = ['#0d9488','#6366f1','#f59e0b','#10b981','#ec4899','#3b82f6','#a855f7'];

  constructor(
    private userService: UserService, 
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.loading.set(true);
    this.userService.getUsers().subscribe({
      next:  (data) => { this.users.set(data); this.loading.set(false); },
      error: (err)  => { console.error('Failed to load users', err); this.loading.set(false); }
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
    return this.users().filter(u => u.roles?.includes(role)).length;
  }

  isCurrentUser(username: string): boolean {
    return this.authService.currentUserValue?.userName === username;
  }

  onRoleChange(userId: string, newRole: string) {
    if (!newRole) return;
    this.confirmationService.confirm({
      message: `Change this user's role to <b>${newRole}</b>?`, 
      header: 'Confirm Role Change', 
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.userService.updateRole(userId, newRole).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Role Updated', detail: 'Role successfully changed.' });
            this.loadUsers();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update role.' })
        });
      }
    });
  }

  onDelete(userId: string) {
    this.confirmationService.confirm({
      message: `Delete this user?`, 
      header: 'Confirm Delete', 
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.userService.deleteUser(userId).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'User successfully deleted.' });
            this.loadUsers();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete user.' })
        });
      }
    });
  }
}
