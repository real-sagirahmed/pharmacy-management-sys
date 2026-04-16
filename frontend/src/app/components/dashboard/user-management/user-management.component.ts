import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { PasswordModule } from 'primeng/password';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    InputTextModule, TagModule, ConfirmDialogModule, ToastModule,
    DialogModule, DropdownModule, PasswordModule
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="page-wrap animate-fadein-up" *ngIf="isSystemAdmin() || hasPermission('Users')">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <!-- Sticky Header Area -->
      <div id="main-sticky-zone" class="sticky-header">
        <div class="page-head pt-2 pb-1 px-4">
          <div style="margin-left: 12px;">
            <h1 class="page-title">User Management</h1>
            <p class="page-sub text-xs">Manage system users, access levels, and account security.</p>
          </div>
          <div class="flex items-center gap-2">
            <button pButton icon="pi pi-shield" label="Roles & Permissions" 
                    class="p-button-outlined p-button-sm p-button-secondary"
                    (click)="showRoleManagement()"></button>
            <button *ngIf="isSystemAdmin() || hasPermission('Users', 'create')" 
                    pButton icon="pi pi-plus" label="Add New User" 
                    class="p-button-sm p-button-success"
                    (click)="showAddDialog()"></button>
            <span class="admin-badge"><i class="pi pi-lock"></i> Admin Only</span>
          </div>
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
              <div class="chip chip-emerald"><i class="pi pi-check-circle"></i> {{ countStatus(true) }} Active</div>
              <div class="chip chip-rose"><i class="pi pi-times-circle"></i> {{ countStatus(false) }} Inactive</div>
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
                  <th style="min-width: 140px;">Mobile</th>
                  <th style="min-width: 180px;">Address</th>
                  <th style="min-width: 120px;">Status</th>
                  <th style="min-width: 150px;">Operations</th>
                  <th alignFrozen="right" pFrozenColumn style="min-width: 80px;">Actions</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-u>
                <tr [class.sysadmin-row]="isUserSystemAdmin(u)">
                  <td>
                    <div class="user-card-inline">
                      <div class="avatar" [style.background]="getAvatarColor(u.fullName)">
                        <img *ngIf="u.profilePicturePath" [src]="authService.getProfileImageUrl(u.profilePicturePath)" class="avatar-img">
                        <span *ngIf="!u.profilePicturePath">{{ u.fullName?.charAt(0)?.toUpperCase() || '?' }}</span>
                      </div>
                      <div class="user-info">
                        <div class="user-name med-name flex items-center gap-2">
                          {{ u.fullName }}
                          <span *ngIf="isUserSystemAdmin(u)" class="sysadmin-badge-inline uppercase">👑 System Owner</span>
                        </div>
                        <div class="user-username text-xs font-bold text-slate-800">&#64;{{ u.userName }} • <span class="text-slate-600 font-medium">{{ u.email }}</span></div>
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
                    <div class="user-phone" style="font-size: 0.8rem; font-weight: 600; color: #475569;">
                      <i class="pi pi-phone mr-1 text-slate-400"></i>
                      {{ u.phoneNumber || 'N/A' }}
                    </div>
                  </td>
                  <td>
                    <div class="user-address text-xs text-slate-500" [title]="u.address" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;">
                      <i class="pi pi-home mr-1"></i>
                      {{ u.address || 'N/A' }}
                    </div>
                  </td>
                  <td>
                    <p-tag [severity]="u.isActive ? 'success' : 'danger'" 
                           [value]="u.isActive ? 'Active' : 'Inactive'"
                           [rounded]="true"></p-tag>
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <!-- Role change & toggle blocked for SystemAdmin UNLESS caller is also a SystemAdmin, PLUS requires EDIT permission -->
                      <ng-container *ngIf="(!isUserSystemAdmin(u) || isSystemAdmin()) && (isSystemAdmin() || hasPermission('Users', 'edit')); else sysAdminLock">
                        <select class="role-select" (change)="onRoleChange(u.id, $any($event.target).value)">
                          <option value="" disabled selected>Role…</option>
                          <option value="Admin">Admin</option>
                          <option value="Manager">Manager</option>
                          <option value="Pharmacist">Pharmacist</option>
                          <option value="Cashier">Cashier</option>
                        </select>
                        <button class="act-btn" [class.act-lock]="u.isActive" [class.act-unlock]="!u.isActive"
                                [title]="u.isActive ? 'Deactivate' : 'Activate'"
                                (click)="onToggleStatus(u.id)"
                                [disabled]="isCurrentUser(u.userName)">
                          <i class="pi" [class.pi-lock]="u.isActive" [class.pi-lock-open]="!u.isActive"></i>
                        </button>
                      </ng-container>
                      <ng-template #sysAdminLock>
                        <span class="sysadmin-lock-msg"><i class="pi pi-shield mr-1"></i>Protected</span>
                      </ng-template>
                    </div>
                  </td>
                  <td alignFrozen="right" pFrozenColumn>
                    <div class="action-btns">
                      <!-- Edit blocked for SystemAdmin UNLESS the caller is also a SystemAdmin, PLUS requires EDIT permission -->
                      <ng-container *ngIf="(!isUserSystemAdmin(u) || isSystemAdmin()) && (isSystemAdmin() || hasPermission('Users', 'edit'))">
                        <button class="act-btn act-edit" title="Edit user" (click)="showEditDialog(u)">
                          <i class="pi pi-pencil"></i>
                        </button>
                      </ng-container>
                      
                      <!-- Delete blocked for SystemAdmin UNLESS the caller is also a SystemAdmin, PLUS requires DELETE permission -->
                      <ng-container *ngIf="(!isUserSystemAdmin(u) || isSystemAdmin()) && (isSystemAdmin() || hasPermission('Users', 'delete'))">
                        <button class="act-btn act-del" title="Delete user" 
                                (click)="onDelete(u.id)"
                                [disabled]="isCurrentUser(u.userName)">
                          <i class="pi pi-trash"></i>
                        </button>
                      </ng-container>

                      <ng-container *ngIf="isUserSystemAdmin(u) && !authService.isSystemAdmin()">
                        <i class="pi pi-lock text-amber-500" title="SystemAdmin — protected"></i>
                      </ng-container>
                    </div>
                  </td>
                </tr>
              </ng-template>

              <ng-template pTemplate="emptymessage">
                <tr><td colspan="7"><div class="empty-state"><i class="pi pi-users empty-icon"></i><p class="empty-text">No users found</p></div></td></tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </div>

      <!-- Add User Dialog -->
      <p-dialog [(visible)]="displayAddDialog" [modal]="true" header="Add New User" 
                [style]="{width: '450px'}" styleClass="user-dialog" [draggable]="false" [resizable]="false">
        <ng-template pTemplate="content">
          <div class="dialog-form pt-4">
            <div class="field">
              <label for="fullName">Full Name</label>
              <input type="text" pInputText id="fullName" [(ngModel)]="newUser.fullName" placeholder="Enter full name" autofocus />
            </div>
            <div class="field">
              <label for="userName">Username</label>
              <div class="p-input-icon-left">
                <i class="pi pi-at"></i>
                <input type="text" pInputText id="userName" [(ngModel)]="newUser.userName" placeholder="unique_username" />
              </div>
            </div>
            <div class="field">
              <label for="email">Email Address</label>
              <div class="p-input-icon-left">
                <i class="pi pi-envelope"></i>
                <input type="email" pInputText id="email" [(ngModel)]="newUser.email" placeholder="example@mail.com" />
              </div>
            </div>
            <div class="field">
              <label for="password">Password</label>
              <p-password [(ngModel)]="newUser.password" [feedback]="false" [toggleMask]="true" 
                          placeholder="••••••••" styleClass="w-full" [inputStyle]="{width: '100%'}"></p-password>
            </div>
            <div class="field">
              <label for="phoneNumber">Mobile Number</label>
              <div class="p-input-icon-left">
                <i class="pi pi-phone"></i>
                <input type="text" pInputText id="phoneNumber" [(ngModel)]="newUser.phoneNumber" placeholder="01XXX-XXXXXX" />
              </div>
            </div>
            <div class="field">
              <label for="address">Residential Address</label>
              <textarea pInputText id="address" [(ngModel)]="newUser.address" placeholder="House #, Road #, Area, City..." rows="2" style="width: 100%; border-radius: 10px; border: 1.5px solid #e2e8f0; padding: 10px;"></textarea>
            </div>
            <div class="field">
              <label for="role">Initial Role</label>
              <p-dropdown [options]="availableRoles" [(ngModel)]="newUser.role" 
                          placeholder="Select a Role" [style]="{width: '100%'}"></p-dropdown>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="footer">
          <div class="dialog-footer">
            <button pButton label="Cancel" icon="pi pi-times" class="p-button-text p-button-secondary" (click)="displayAddDialog = false"></button>
            <button pButton label="Create User" icon="pi pi-check" class="p-button-success" (click)="saveUser()" [loading]="saving"></button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Edit User Dialog -->
      <p-dialog [(visible)]="displayEditDialog" [modal]="true" header="Edit User Details" 
                [style]="{width: '450px'}" styleClass="user-dialog" [draggable]="false" [resizable]="false">
        <ng-template pTemplate="content">
          <div class="dialog-form pt-4">
            <div class="field">
              <label for="efullName">Full Name</label>
              <input type="text" pInputText id="efullName" [(ngModel)]="editUser.fullName" />
            </div>
            <div class="field">
              <label for="euserName">Username</label>
              <div class="p-input-icon-left">
                <i class="pi pi-at"></i>
                <input type="text" pInputText id="euserName" [(ngModel)]="editUser.userName" />
              </div>
            </div>
            <div class="field">
              <label for="eemail">Email Address</label>
              <div class="p-input-icon-left">
                <i class="pi pi-envelope"></i>
                <input type="email" pInputText id="eemail" [(ngModel)]="editUser.email" />
              </div>
            </div>
            <div class="field">
              <label for="epassword">New Password (optional)</label>
              <p-password [(ngModel)]="editUser.password" [feedback]="false" [toggleMask]="true" 
                          placeholder="Leave blank to keep current" styleClass="w-full" [inputStyle]="{width: '100%'}"></p-password>
            </div>
            <div class="field">
              <label for="ephoneNumber">Mobile Number</label>
              <div class="p-input-icon-left">
                <i class="pi pi-phone"></i>
                <input type="text" pInputText id="ephoneNumber" [(ngModel)]="editUser.phoneNumber" placeholder="01XXX-XXXXXX" />
              </div>
            </div>
            <div class="field">
              <label for="eaddress">Residential Address</label>
              <textarea pInputText id="eaddress" [(ngModel)]="editUser.address" placeholder="Enter full address" rows="2" style="width: 100%; border-radius: 10px; border: 1.5px solid #e2e8f0; padding: 10px;"></textarea>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="footer">
          <div class="dialog-footer">
            <button pButton label="Cancel" icon="pi pi-times" class="p-button-text p-button-secondary" (click)="displayEditDialog = false"></button>
            <button pButton label="Update User" icon="pi pi-check" class="p-button-info" (click)="updateUser()" [loading]="saving"></button>
          </div>
        </ng-template>
      </p-dialog>
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
    .page-sub { margin: 0; color: #334155; font-size: 0.8rem; font-weight: 500; }
    .admin-badge {
      display: flex; align-items: center; gap: 6px; background: #ede9fe; color: #7c3aed; padding: 6px 14px;
      border-radius: 99px; font-size: .75rem; font-weight: 700; border: 1px solid #ddd6fe; margin-right: 12px;
    }
    
    .table-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    
    .summary-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: .8rem; font-weight: 700; }
    .chip-teal { background: #ccfbf1; color: #0f766e; } .chip-green { background: #dcfce7; color: #15803d; } .chip-slate { background: #f1f5f9; color: #1e293b; } .chip-purple { background: #ede9fe; color: #6d28d9; }
    .chip-emerald { background: #dcfce7; color: #065f46; } .chip-rose { background: #fee2e2; color: #991b1b; }
    
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
      background-color: #f1f5f9 !important; 
      color: #0d9488 !important; 
      font-weight: 900 !important; 
      font-size: 0.75rem !important; 
      text-transform: uppercase !important; 
      letter-spacing: 0.8px !important; 
      padding: 12px 12px !important; 
      border-bottom: 2.5px solid #0d9488 !important;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td { padding: 8px 12px !important; border-bottom: 1px solid #edf2f7; }
    
    /* Avatar & Inline Card */
    .user-card-inline { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 36px; height: 36px; border-radius: 10px;
      color: #fff; font-size: 1rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      overflow: hidden;
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
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
    .role-sysadmin  { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

    /* SystemAdmin UI Protection */
    .sysadmin-row { background: #fffbeb !important; }
    .sysadmin-badge-inline {
      font-size: 0.6rem; font-weight: 900; padding: 1px 7px; border-radius: 4px;
      background: #fef3c7; color: #b45309; border: 1px solid #fde68a; letter-spacing: 0.05em;
    }
    .sysadmin-lock-msg {
      display: flex; align-items: center; font-size: 0.7rem; font-weight: 700;
      color: #b45309; background: #fef3c7; border: 1px solid #fde68a;
      padding: 3px 8px; border-radius: 6px;
    }


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
    .act-edit { background: #eff6ff; color: #3b82f6; }
    .act-lock { background: #fef2f2; color: #ef4444; }
    .act-unlock { background: #f0fdf4; color: #22c55e; }
    .act-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; gap: 8px; }
    .empty-icon { font-size: 3rem; color: #cbd5e1; } .empty-text { font-size: 1rem; font-weight: 600; color: #334155; margin: 0; }

    /* ─── Premium Dialog Component ─── */
    ::ng-deep .user-dialog .p-dialog-header {
      background: #f8fafc; border-bottom: 3px solid #0d9488; padding: 1.25rem 1.5rem;
    }
    ::ng-deep .user-dialog .p-dialog-title { font-weight: 800; color: #1e293b; font-size: 1.2rem; }
    ::ng-deep .user-dialog .p-dialog-content { padding: 0 1.5rem 1.5rem 1.5rem !important; background: #ffffff; }
    ::ng-deep .user-dialog .p-dialog-footer { background: #f8fafc; padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; }

    .dialog-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .field { display: flex; flex-direction: column; gap: 0.5rem; }
    .field label { font-size: 0.85rem; font-weight: 800; color: #1e293b; letter-spacing: 0.025em; }

    ::ng-deep .user-dialog .p-inputtext, 
    ::ng-deep .user-dialog .p-dropdown,
    ::ng-deep .user-dialog .p-password input {
      padding: 0.75rem 1rem !important; border-radius: 10px !important; border: 1.5px solid #e2e8f0 !important;
      font-size: 0.9rem !important; transition: all 0.2s; background: #fcfdfe;
    }
    ::ng-deep .user-dialog .p-inputtext:focus,
    ::ng-deep .user-dialog .p-dropdown:focus-within {
      border-color: #0d9488 !important; box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.15) !important; background: #fff;
    }
    ::ng-deep .p-input-icon-left i { color: #64748b; }
    ::ng-deep .p-input-icon-left .p-inputtext { padding-left: 2.5rem !important; }
    
    .dialog-footer { display: flex; justify-content: flex-end; gap: 0.75rem; width: 100%; }
    ::ng-deep .p-button { border-radius: 10px !important; font-weight: 700 !important; }
  `]
})
export class UserManagementComponent implements OnInit {
  users = signal<any[]>([]);
  searchText = '';
  loading = signal(false);
  saving = false;

  // Add User Dialog
  displayAddDialog = false;
  newUser = { fullName: '', userName: '', email: '', password: '', role: 'Cashier', phoneNumber: '', address: '' };
  
  // Edit User Dialog
  displayEditDialog = false;
  editUser = { id: '', fullName: '', userName: '', email: '', phoneNumber: '', address: '', password: '' };

  availableRoles = ['Admin', 'Manager', 'Pharmacist', 'Cashier'];

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
    private messageService: MessageService,
    private router: Router
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
      case 'systemadmin': return 'role-badge role-sysadmin';
      case 'admin':       return 'role-badge role-admin';
      case 'manager':     return 'role-badge role-manager';
      case 'pharmacist':  return 'role-badge role-pharmacist';
      case 'cashier':     return 'role-badge role-cashier';
      default:            return 'role-badge role-default';
    }
  }

  isUserSystemAdmin(u: any): boolean {
    return u.roles && u.roles.includes('SystemAdmin');
  }

  isCurrentUser(userName: string): boolean {
    return this.authService.getUsername()?.toLowerCase() === userName?.toLowerCase();
  }

  hasPermission(mod: string, act: 'view' | 'create' | 'edit' | 'delete' = 'view') {
    return this.authService.hasPermission(mod, act);
  }

  isSystemAdmin() {
    return this.authService.isSystemAdmin();
  }

  countRole(role: string): number {
    return this.users().filter(u => u.roles?.includes(role)).length;
  }

  countStatus(active: boolean): number {
    return this.users().filter(u => u.isActive === active).length;
  }

  onToggleStatus(userId: string) {
    const user = this.users().find(u => u.id === userId);
    if (!user) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to <b>${user.isActive ? 'Deactivate' : 'Activate'}</b> this user?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-circle',
      accept: () => {
        this.userService.toggleStatus(userId).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User status updated.' });
            this.loadUsers();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status.' })
        });
      }
    });
  }

  showAddDialog() {
    this.newUser = { fullName: '', userName: '', email: '', password: '', role: 'Cashier', phoneNumber: '', address: '' };
    this.displayAddDialog = true;
  }

  hideAddDialog() {
    this.displayAddDialog = false;
  }

  saveUser() {
    if (!this.newUser.fullName || !this.newUser.userName || !this.newUser.email || !this.newUser.password) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all fields.' });
      return;
    }

    this.saving = true;
    this.userService.createByAdmin(this.newUser).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Created', detail: 'User created successfully.' });
        this.displayAddDialog = false;
        this.saving = false;
        this.loadUsers();
      },
      error: (err) => {
        console.error('Failed to create user', err);
        const detail = err.error?.[0]?.description || 'Failed to create user.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
        this.saving = false;
      }
    });
  }

  showEditDialog(user: any) {
    this.editUser = {
      id: user.id,
      fullName: user.fullName,
      userName: user.userName,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      password: ''
    };
    this.displayEditDialog = true;
  }

  updateUser() {
    if (!this.editUser.fullName || !this.editUser.email || !this.editUser.userName) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Name, Username and Email are required.' });
      return;
    }

    this.saving = true;
    this.userService.updateUser(this.editUser.id, this.editUser).subscribe({
      next: () => {
        // If current admin is editing their own record, update the cache to sync UI
        if (this.editUser.id === this.authService.currentUserValue?.id) {
          this.authService.updateCachedUser({
            fullName: this.editUser.fullName,
            userName: this.editUser.userName,
            email: this.editUser.email,
            phoneNumber: this.editUser.phoneNumber,
            address: this.editUser.address
          });
        }

        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'User details updated.' });
        this.displayEditDialog = false;
        this.saving = false;
        this.loadUsers();
      },
      error: (err) => {
        const detail = err.error?.[0]?.description || 'Failed to update user.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
        this.saving = false;
      }
    });
  }

  showRoleManagement() {
    this.router.navigate(['/dashboard/roles']);
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
