import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, RoleDto, PermissionDto } from '../../../services/user.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DropdownModule, CheckboxModule, InputTextModule, ToastModule,
    ConfirmDialogModule, DialogModule, TagModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="page-wrap animate-fadein-up">
      <p-toast></p-toast>
      
      <div class="sticky-header">
        <div class="compact-header px-4">
          <!-- Title Section -->
          <div class="flex items-center gap-3">
            <button pButton icon="pi pi-arrow-left" class="p-button-text p-button-sm back-btn" (click)="goBack()"></button>
            <div style="margin-left: 30px;">
              <h1 class="page-title text-sm">Roles & Permissions</h1>
              <p class="page-sub text-xs">Define system roles and module permissions.</p>
            </div>
          </div>

          <!-- Create Role Section (Merged) -->
          <div class="flex items-center gap-2 flex-1 justify-center mx-4 max-w-md">
            <input type="text" pInputText [(ngModel)]="newRoleName" placeholder="New role name..." class="p-inputtext-sm w-48">
            <button pButton label="Create" icon="pi pi-plus" class="p-button-sm p-button-outlined" (click)="addRole()" [loading]="creatingRole"></button>
          </div>

          <!-- Actions & Feedback -->
          <div class="flex items-center gap-3">
            <div *ngIf="hasUnsavedChanges()" class="unsaved-badge animate-pulse">
               <i class="pi pi-exclamation-triangle mr-1"></i> Unsaved
            </div>
          </div>
        </div>
      </div>

      <div class="content-grid px-4 py-3">
        <!-- Role Selection -->
        <div class="sidebar-card">
          <h3 class="section-title">Role Management</h3>
          
          <!-- Role List -->
          <div class="role-list mb-4">
            <div *ngFor="let role of roles" 
                 class="role-row" 
                 [class.selected-role]="selectedRole?.id === role.id"
                 (click)="onRoleSelect(role)">
              <div class="flex-1">
                <div class="role-name">{{ role.name }}</div>
                <div class="role-stats text-xs">
                   <i class="pi pi-users mr-1"></i> {{ role.userCount || 0 }} users
                </div>
              </div>
              <div class="role-actions">
                <button pButton icon="pi pi-pencil" class="p-button-rounded p-button-text p-button-sm" 
                        (click)="editRole(role); $event.stopPropagation()"></button>
                <button pButton icon="pi pi-trash" class="p-button-rounded p-button-text p-button-sm p-button-danger" 
                        (click)="confirmDelete(role); $event.stopPropagation()"
                        *ngIf="role.name !== 'Admin'"></button>
              </div>
            </div>
          </div>

        </div>

        <!-- Permission Matrix -->
        <div class="main-card" *ngIf="selectedRole; else noRole">
          <!-- Compact Matrix Header -->
          <div class="matrix-sticky-header">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Permissions:</span>
                <span class="text-xs font-black text-teal-600 uppercase">{{ selectedRole.name }}</span>
              </div>
              <div class="search-wrap compact-search">
                <i class="pi pi-search search-icon"></i>
                <input type="text" pInputText [(ngModel)]="permSearch" placeholder="Filter modules..." class="p-inputtext-sm search-field">
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button pButton icon="pi pi-save" label="Save" 
                      class="p-button-success p-button-sm shadow-sm px-4" (click)="savePermissions()"
                      [loading]="savingPermissions"></button>
            </div>
          </div>

          <p-table [value]="filteredPermissions()" styleClass="p-datatable-sm matrix-table" [rowHover]="true">
            <ng-template pTemplate="header">
              <tr>
                <th style="min-width: 150px;">Module</th>
                <th class="text-center">
                  <div class="flex flex-col items-center gap-1">
                    <span class="text-[10px]">VIEW</span>
                    <button class="bulk-set-btn" (click)="toggleAllColumn('canView')" title="Toggle View All">
                      <i class="pi pi-check"></i>
                    </button>
                  </div>
                </th>
                <th class="text-center">
                  <div class="flex flex-col items-center gap-1">
                    <span class="text-[10px]">CREATE</span>
                    <button class="bulk-set-btn" (click)="toggleAllColumn('canCreate')" title="Toggle Create All">
                      <i class="pi pi-check"></i>
                    </button>
                  </div>
                </th>
                <th class="text-center">
                  <div class="flex flex-col items-center gap-1">
                    <span class="text-[10px]">EDIT</span>
                    <button class="bulk-set-btn" (click)="toggleAllColumn('canEdit')" title="Toggle Edit All">
                      <i class="pi pi-check"></i>
                    </button>
                  </div>
                </th>
                <th class="text-center">
                  <div class="flex flex-col items-center gap-1">
                    <span class="text-[10px]">DELETE</span>
                    <button class="bulk-set-btn" (click)="toggleAllColumn('canDelete')" title="Toggle Delete All">
                      <i class="pi pi-check"></i>
                    </button>
                  </div>
                </th>
                <th class="text-center" style="width: 60px;">
                   <div class="flex flex-col items-center gap-1">
                    <span class="text-[10px]">ALL</span>
                    <i class="pi pi-th-large text-slate-300"></i>
                  </div>
                </th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-p>
              <tr>
                <td>
                   <div class="flex items-center gap-2">
                     <i [class]="'pi ' + getModuleIcon(p.moduleName) + ' module-icon'"></i>
                     <span class="font-bold text-slate-700">{{ p.moduleName }}</span>
                   </div>
                </td>
                <td class="text-center">
                  <p-checkbox [(ngModel)]="p.canView" [binary]="true"></p-checkbox>
                </td>
                <td class="text-center">
                  <p-checkbox [(ngModel)]="p.canCreate" [binary]="true"></p-checkbox>
                </td>
                <td class="text-center">
                  <p-checkbox [(ngModel)]="p.canEdit" [binary]="true"></p-checkbox>
                </td>
                <td class="text-center">
                  <p-checkbox [(ngModel)]="p.canDelete" [binary]="true"></p-checkbox>
                </td>
                <td class="text-center">
                  <button class="row-set-btn" [class.all-set]="isRowAllSet(p)" (click)="toggleRow(p)">
                    <i class="pi" [class.pi-check-square]="isRowAllSet(p)" [class.pi-stop]="!isRowAllSet(p)"></i>
                  </button>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        <ng-template #noRole>
          <div class="main-card empty-matrix">
            <i class="pi pi-shield mb-3" style="font-size: 4rem; color: #e2e8f0;"></i>
            <h3>No Role Selected</h3>
            <p>Please select a role from the left to view and manage its permissions.</p>
          </div>
        </ng-template>
      </div>

      <!-- Edit Role Name Dialog -->
      <p-dialog [(visible)]="displayEditDialog" header="Edit Role Name" [modal]="true" [style]="{width: '350px'}">
        <div class="field mt-4">
          <input type="text" pInputText [(ngModel)]="roleToEditName" class="w-full">
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="displayEditDialog = false"></button>
          <button pButton label="Update" (click)="updateRole()" [loading]="updatingRole"></button>
        </ng-template>
      </p-dialog>

      <p-confirmDialog header="Confirmation" icon="pi pi-exclamation-triangle"></p-confirmDialog>
    </div>
  `,
  styles: [`
    .page-wrap { display: flex; flex-direction: column; height: calc(100vh - 70px); background: #f8fafc; }
    
    .compact-header { 
      height: 56px; display: flex; align-items: center; justify-content: space-between; 
      background: #fff; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      position: sticky; top: 0; z-index: 100;
    }
    .back-btn { color: #94a3b8 !important; }
    .back-btn:hover { color: #0d9488 !important; background: #f0fdfa !important; }
    
    .page-title { font-size: 0.95rem !important; margin: 0; font-weight: 800; color: #0d9488; line-height: 1; transform: translateY(-19px); }
    .page-sub { margin: 0; color: #94a3b8; font-weight: 500; margin-top: -19px; }

    .sidebar-card::-webkit-scrollbar, .main-card::-webkit-scrollbar { width: 6px; }
    .sidebar-card::-webkit-scrollbar-track, .main-card::-webkit-scrollbar-track { background: transparent; }
    .sidebar-card::-webkit-scrollbar-thumb, .main-card::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .sidebar-card::-webkit-scrollbar-thumb:hover, .main-card::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    .sidebar-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; overflow-y: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .main-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; overflow-y: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    
    .content-grid { display: grid; grid-template-columns: 1fr 3fr; gap: 1.25rem; flex: 1; overflow: hidden; padding: 1rem 1.25rem; }
    
    .section-title { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.25rem; }
    .divider { height: 1px; background: #f1f5f9; }
    .empty-matrix { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; text-align: center; height: 100%; }
    .empty-matrix h3 { color: #64748b; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 700; }
    .empty-matrix p { font-size: 0.9rem; max-width: 250px; }
    
    /* Role List UI */
    .role-list { display: flex; flex-direction: column; gap: 10px; }
    .role-row { 
      padding: 14px 16px; border-radius: 12px; border: 1.5px solid #f1f5f9; cursor: pointer;
      display: flex; align-items: center; justify-content: space-between; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      background: #fafafa;
    }
    .role-row:hover { background: #fff; border-color: #0d948840; transform: translateX(4px); box-shadow: 0 4px 12px -2px rgba(13, 148, 136, 0.08); }
    .selected-role { background: #f0fdfa !important; border-color: #0d9488 !important; box-shadow: 0 4px 12px -2px rgba(13, 148, 136, 0.15) !important; }
    .role-name { font-weight: 700; font-size: 0.95rem; color: #1e293b; }
    .selected-role .role-name { color: #0d9488; }
    .role-stats { color: #64748b; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
    .selected-role .role-stats { color: #0d9488aa; }

    /* Matrix Table UI */
    .matrix-header { display: flex; justify-content: space-between; align-items: flex-end; }
    .matrix-table { border-radius: 12px; overflow: hidden; }
    ::ng-deep .matrix-table .p-datatable-thead > tr > th { 
      background: #f8fafc !important; color: #475569 !important; font-size: 0.7rem !important; 
      border-bottom: 2px solid #e2e8f0 !important; padding: 16px 12px !important; 
      text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;
      position: sticky; top: 0; z-index: 5;
    }
    ::ng-deep .matrix-table .p-datatable-tbody > tr > td { padding: 14px 12px !important; border-bottom: 1px solid #f1f5f9; }
    ::ng-deep .matrix-table .p-datatable-tbody > tr:hover { background: #fcfcfc !important; }
    
    .module-icon { color: #94a3b8; font-size: 1rem; width: 24px; opacity: 0.7; }
    .text-muted { color: #94a3b8; font-weight: 500; }
    .text-primary { color: #0d9488; font-weight: 800; }
    
    .bulk-set-btn, .row-set-btn { 
      background: #f1f5f9; border: 1.5px solid #e2e8f0; cursor: pointer; color: #94a3b8; transition: all 0.2s; 
      padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center;
    }
    .bulk-set-btn i, .row-set-btn i { font-size: 0.6rem; font-weight: 900; }
    .bulk-set-btn:hover { background: #0d9488; color: #fff; border-color: #0d9488; }
    .row-set-btn { background: #fff; opacity: 0.6; }
    .row-set-btn:hover { color: #0d9488; opacity: 1; background: #f0fdfa; border-color: #0d9488; }
    .all-set { color: #fff !important; opacity: 1 !important; background: #0d9488 !important; border-color: #0d9488 !important; }
    
    .top-actions-bar { background: #fff; border-bottom: 1px solid #e2e8f0; }

    .matrix-header { display: flex; justify-content: space-between; align-items: flex-end; }
    
    .matrix-sticky-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 1.5rem; border-bottom: 1px solid #f1f5f9;
      position: sticky; top: 0; background: #fff; z-index: 20;
      border-radius: 16px 16px 0 0;
    }
    .compact-search { width: 180px; }
    .compact-search .search-field { padding-top: 6px !important; padding-bottom: 6px !important; font-size: 0.8rem; }
    
    .search-wrap { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; pointer-events: none; font-size: 0.8rem; }
    .search-field { width: 100%; padding-left: 34px !important; border-radius: 8px !important; border: 1.5px solid #e2e8f0 !important; background: #f8fafc !important; transition: all 0.2s; }
    .search-field:focus { background: #fff !important; border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1) !important; }
    
    .unsaved-badge {
      background: #fffbeb; color: #92400e; padding: 6px 14px; border-radius: 99px; font-size: 0.72rem; font-weight: 700; border: 1px solid #fde68a;
      box-shadow: 0 2px 4px rgba(146, 64, 14, 0.05); display: flex; align-items: center; gap: 6px;
    }

    ::ng-deep .p-checkbox .p-checkbox-box { border-radius: 6px; border-width: 2px; transition: all 0.2s; }
    ::ng-deep .p-checkbox .p-checkbox-box.p-highlight { background: #0d9488 !important; border-color: #0d9488 !important; }
    ::ng-deep .p-checkbox:not(.p-checkbox-disabled) .p-checkbox-box:hover { border-color: #0d9488 !important; }

    /* Matrix Table UI - Sticky Header Fix */
    .matrix-table { border-radius: 0; }
    ::ng-deep .matrix-table .p-datatable-wrapper { padding: 0 1.5rem 1.5rem 1.5rem; }
    ::ng-deep .matrix-table .p-datatable-thead > tr > th { 
      background: #f8fafc !important; color: #475569 !important; font-size: 0.7rem !important; 
      border-bottom: 2px solid #e2e8f0 !important; padding: 4px 12px !important; 
      text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;
      position: sticky !important; top: 32px !important; z-index: 15 !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    ::ng-deep .p-dialog { border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; border: none; }
    ::ng-deep .p-dialog .p-dialog-header { background: #fff; padding: 1.5rem; border-bottom: 1px solid #f1f5f9; }
    ::ng-deep .p-dialog .p-dialog-content { padding: 1.5rem !important; }
    ::ng-deep .p-dialog .p-dialog-footer { background: #f8fafc; padding: 1rem 1.5rem; border-top: 1px solid #f1f5f9; }
    ::ng-deep .p-confirm-dialog .p-dialog-content { display: flex; align-items: center; gap: 1rem; }
  `]
})
export class RoleManagementComponent implements OnInit {
  roles: RoleDto[] = [];
  selectedRole: RoleDto | null = null;
  newRoleName = '';
  creatingRole = false;
  
  permissions: PermissionDto[] = [];
  backupPermissions: string = '';
  savingPermissions = false;
  
  permSearch = '';
  
  displayEditDialog = false;
  roleToEdit: RoleDto | null = null;
  roleToEditName = '';
  updatingRole = false;

  private modules = [
    { name: 'Dashboard', icon: 'pi-home' },
    { name: 'Medicines', icon: 'pi-box' },
    { name: 'Purchases', icon: 'pi-shopping-cart' },
    { name: 'Sales', icon: 'pi-receipt' },
    { name: 'Parties', icon: 'pi-users' },
    { name: 'Due Collection', icon: 'pi-money-bill' },
    { name: 'Inventory', icon: 'pi-database' },
    { name: 'Reports', icon: 'pi-chart-line' },
    { name: 'Users', icon: 'pi-user-edit' },
    { name: 'Roles', icon: 'pi-shield' },
    { name: 'Settings', icon: 'pi-cog' },
    { name: 'Master Data', icon: 'pi-list' }
  ];

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.userService.getRoles().subscribe(data => this.roles = data);
  }

  onRoleSelect(role: RoleDto) {
    if (this.hasUnsavedChanges()) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes. Discard them and switch role?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.selectedRole = role;
          this.loadPermissions(role.id);
        }
      });
    } else {
      this.selectedRole = role;
      this.loadPermissions(role.id);
    }
  }

  loadPermissions(roleId: string) {
    this.userService.getPermissions(roleId).subscribe(data => {
      let finalPerms: PermissionDto[] = [];
      
      // Map modules to current interface
      finalPerms = this.modules.map(mod => {
        const existing = data.find(p => p.moduleName === mod.name);
        return existing || {
          roleId: roleId,
          moduleName: mod.name,
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false
        };
      });
      
      this.permissions = finalPerms;
      this.backupPermissions = JSON.stringify(this.permissions);
    });
  }

  filteredPermissions() {
    const q = this.permSearch.toLowerCase().trim();
    if (!q) return this.permissions;
    return this.permissions.filter(p => p.moduleName.toLowerCase().includes(q));
  }

  getModuleIcon(name: string): string {
    return this.modules.find(m => m.name === name)?.icon || 'pi-circle';
  }

  hasUnsavedChanges(): boolean {
    if (!this.selectedRole || !this.backupPermissions) return false;
    return this.backupPermissions !== JSON.stringify(this.permissions);
  }

  toggleRow(p: PermissionDto) {
    const newVal = !this.isRowAllSet(p);
    p.canView = newVal;
    p.canCreate = newVal;
    p.canEdit = newVal;
    p.canDelete = newVal;
  }

  isRowAllSet(p: PermissionDto): boolean {
    return p.canView && p.canCreate && p.canEdit && p.canDelete;
  }

  toggleAllColumn(prop: keyof PermissionDto) {
    // Check if everything is currently set
    const allSet = this.permissions.every(p => p[prop] === true);
    this.permissions.forEach(p => (p as any)[prop] = !allSet);
  }

  addRole() {
    if (!this.newRoleName.trim()) return;
    this.creatingRole = true;
    this.userService.createRole(this.newRoleName).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Role created.' });
        this.newRoleName = '';
        this.creatingRole = false;
        this.loadRoles();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create role.' });
        this.creatingRole = false;
      }
    });
  }

  savePermissions() {
    if (!this.selectedRole) return;
    this.savingPermissions = true;
    this.userService.updatePermissions(this.selectedRole.id, this.permissions).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Permissions updated successfully.' });
        this.savingPermissions = false;
        this.backupPermissions = JSON.stringify(this.permissions);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save permissions.' });
        this.savingPermissions = false;
      }
    });
  }

  editRole(role: RoleDto) {
    if (role.name === 'Admin') {
      this.messageService.add({ severity: 'warn', summary: 'Restricted', detail: 'Admin role cannot be edited.' });
      return;
    }
    this.roleToEdit = role;
    this.roleToEditName = role.name;
    this.displayEditDialog = true;
  }

  updateRole() {
    if (!this.roleToEdit || !this.roleToEditName.trim()) return;
    this.updatingRole = true;
    this.userService.updateRoleName(this.roleToEdit.id, this.roleToEditName).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Role name updated.' });
        this.displayEditDialog = false;
        this.updatingRole = false;
        this.loadRoles();
      },
      error: (err) => {
        const msg = err.error?.[0]?.description || 'Failed to update role.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        this.updatingRole = false;
      }
    });
  }

  confirmDelete(role: RoleDto) {
    if (role.name === 'Admin') {
      this.messageService.add({ severity: 'warn', summary: 'Restricted', detail: 'Admin role cannot be deleted.' });
      return;
    }
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
      accept: () => {
        this.userService.deleteRole(role.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Role deleted successfully.' });
            if (this.selectedRole?.id === role.id) this.selectedRole = null;
            this.loadRoles();
          },
          error: (err) => {
            const msg = err.error?.[0]?.description || 'Failed to delete role.';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
          }
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/users']);
  }
}
