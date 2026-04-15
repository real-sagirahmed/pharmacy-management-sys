import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, RoleDto, PermissionDto } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
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
    <div class="page-wrap animate-fadein-up" *ngIf="isSystemAdmin || hasPermission('Roles')">
      <p-toast></p-toast>

      <!-- Security Guidance Banner for non-SystemAdmin -->
      <div class="sysadmin-banner" *ngIf="!isSystemAdmin">
        <i class="pi pi-shield mr-2 text-amber-600"></i>
        <span><strong>Viewing Mode:</strong> Only the <strong class="text-amber-800">SystemAdmin</strong> can modify roles and permissions. Changes are restricted for your current role.</span>
      </div>
      
      <div class="sticky-header">
        <div class="compact-header px-3 flex items-center gap-3">
          <button pButton icon="pi pi-arrow-left" (click)="navigateBack()" 
                  class="p-button-text p-button-secondary p-button-sm p-0 h-8 w-8"></button>
          
          <div class="flex flex-col mr-auto">
            <h1 class="text-base font-extrabold text-slate-900 m-0 leading-tight">Roles & Permissions</h1>
            <p class="text-[11px] text-slate-700 m-0 leading-none mt-1 font-semibold">Define system roles and module permissions.</p>
          </div>

          <!-- Create Role Section (Merged) -->
          <div class="flex items-center gap-2 max-w-xs" *ngIf="isSystemAdmin || hasPermission('Roles', 'create')">
            <input type="text" pInputText [(ngModel)]="newRoleName" 
                   placeholder="New role name..." class="p-inputtext-sm text-xs w-32"
                   (input)="blockReservedRoleName()">
            <button pButton icon="pi pi-plus" label="Create" 
                    (click)="addRole()" [loading]="creatingRole"
                    class="p-button-sm p-button-outlined"></button>
          </div>

          <!-- Actions & Feedback -->
          <div class="flex items-center gap-3">
            <div *ngIf="hasUnsavedChanges()" class="unsaved-badge animate-pulse">
               <i class="pi pi-exclamation-triangle mr-1"></i> Unsaved
            </div>

            <div class="flex items-center gap-2" *ngIf="isSystemAdmin || hasPermission('Roles', 'edit')">
              <button pButton label="Save Changes" icon="pi pi-check" 
                      class="p-button-sm p-button-success" 
                      [disabled]="!hasUnsavedChanges()" [loading]="savingPermissions"
                      (click)="savePermissions()"></button>
              <button pButton label="Discard" icon="pi pi-times" 
                      class="p-button-sm p-button-outlined p-button-secondary" 
                      [disabled]="!hasUnsavedChanges()" 
                      (click)="discardChanges()"></button>
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
                 [class.sysadmin-role-row]="role.name === 'SystemAdmin'"
                 (click)="onRoleSelect(role)">
              <div class="flex items-center gap-3">
                <i [class]="'role-icon ' + (role.name === 'SystemAdmin' ? 'pi pi-crown text-amber-500' : 'pi pi-users text-slate-500')"></i>
                <div class="flex flex-col">
                  <span class="role-name">{{ role.name }}</span>
                  <div class="flex gap-2">
                    <span class="text-[10px] font-bold text-slate-600">ID: {{ role.id | slice:0:8 }}...</span>
                    <span *ngIf="role.name === 'SystemAdmin'" class="sysadmin-role-badge uppercase">Protected</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1" *ngIf="role.name !== 'SystemAdmin' && role.name !== 'Admin'">
                <div class="role-stats text-xs">
                   <i class="pi pi-users mr-1"></i> {{ role.userCount || 0 }} users
                </div>
              </div>
              <div class="role-actions">
                <!-- Edit & Delete hidden for SystemAdmin role itself -->
                <ng-container *ngIf="role.name !== 'SystemAdmin' && role.name !== 'Admin' && (isSystemAdmin || hasPermission('Roles', 'edit'))">
                  <button pButton icon="pi pi-pencil" class="p-button-rounded p-button-text p-button-sm" 
                          (click)="editRole(role); $event.stopPropagation()"></button>
                </ng-container>
                <ng-container *ngIf="role.name !== 'SystemAdmin' && role.name !== 'Admin' && (isSystemAdmin || hasPermission('Roles', 'delete'))">
                  <button pButton icon="pi pi-trash" class="p-button-rounded p-button-text p-button-sm p-button-danger" 
                          (click)="confirmDelete(role); $event.stopPropagation()"></button>
                </ng-container>
                <ng-container *ngIf="role.name === 'SystemAdmin' || role.name === 'Admin' || (!isSystemAdmin && !hasPermission('Roles', 'edit'))">
                  <i class="pi pi-lock text-amber-500 text-sm" [title]="!isSystemAdmin ? 'Permission required to edit' : 'System role is protected'"></i>
                </ng-container>
              </div>
            </div>
          </div>


        </div>

        <!-- Permission Matrix -->
        <div class="main-card" *ngIf="selectedRole; else noRole">
          <!-- SystemAdmin full-access banner -->
          <div *ngIf="selectedRole.name === 'SystemAdmin'" class="sysadmin-banner">
            <i class="pi pi-shield mr-2"></i>
            <strong>&#x1F451; SystemAdmin</strong> has <strong>full access</strong> to all modules — permissions are managed automatically and cannot be changed.
          </div>

          <!-- Compact Matrix Header -->
          <p-table [value]="filteredPermissions()" [scrollable]="true" scrollHeight="calc(100vh - 180px)" 
                   styleClass="p-datatable-sm matrix-table" [rowHover]="true">
            <ng-template pTemplate="header">
              <tr class="unified-header-row">
                <th style="min-width: 280px; background: white !important;">
                  <div class="flex items-center gap-3 w-full">
                      <div class="flex items-center gap-2">
                         <span class="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest whitespace-nowrap">Permissions:</span>
                         <span class="text-xs font-black text-teal-700 uppercase whitespace-nowrap">{{ selectedRole.name }}</span>
                      </div>
                    <div class="search-wrap compact-search-inline">
                      <i class="pi pi-search search-icon-sm"></i>
                      <input type="text" pInputText placeholder="Filter..." 
                             [(ngModel)]="permSearch" class="search-field-sm">
                    </div>
                  </div>
                </th>
                <th class="text-center" style="background: white !important;">
                  <div class="flex flex-col items-center gap-3">
                    <span class="text-[10px] font-bold text-slate-600">VIEW</span>
                    <button class="bulk-set-btn" (click)="toggleAllColumn('canView')" title="Toggle View All">
                      <i class="pi pi-check text-[10px]"></i>
                    </button>
                  </div>
                </th>
                <th class="text-center" style="background: white !important;">
                  <div class="flex flex-col items-center gap-3">
                    <span class="text-[10px] font-bold text-slate-600">CREATE</span>
                    <button class="bulk-set-btn" (click)="toggleAllColumn('canCreate')" title="Toggle Create All">
                      <i class="pi pi-check text-[10px]"></i>
                    </button>
                  </div>
                </th>
                <th class="text-center" style="background: white !important;">
                  <div class="flex flex-col items-center gap-3">
                    <span class="text-[10px] font-bold text-slate-600">EDIT</span>
                    <button class="bulk-set-btn" (click)="toggleAllColumn('canEdit')" title="Toggle Edit All">
                      <i class="pi pi-check text-[10px]"></i>
                    </button>
                  </div>
                </th>
                <th class="text-center" style="background: white !important;">
                  <div class="flex flex-col items-center gap-3">
                    <span class="text-[10px] font-bold text-slate-600">DELETE</span>
                    <button class="bulk-set-btn" (click)="toggleAllColumn('canDelete')" title="Toggle Delete All">
                      <i class="pi pi-check text-[10px]"></i>
                    </button>
                  </div>
                </th>
                <th class="text-center" style="width: 120px; background: white !important;">
                   <div class="flex items-center justify-between gap-3 px-1">
                    <div class="flex flex-col items-center gap-1">
                      <span class="text-[9px] font-bold text-slate-700">ALL</span>
                      <i class="pi pi-th-large text-slate-500 text-[10px]"></i>
                    </div>
                    <button pButton icon="pi pi-save" (click)="savePermissions()" 
                            [disabled]="saving" class="p-button-success p-button-sm h-8 w-8"></button>
                  </div>
                </th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-p>
              <tr [class.opacity-50]="selectedRole.name === 'SystemAdmin'">
                <td>
                   <div class="flex items-center gap-2">
                     <i [class]="'pi ' + getModuleIcon(p.moduleName) + ' module-icon'"></i>
                     <span class="font-bold text-slate-700">{{ p.moduleName }}</span>
                   </div>
                </td>
                <td class="text-center">
                  <p-checkbox [(ngModel)]="p.canView" [binary]="true" [disabled]="selectedRole.name === 'SystemAdmin' || !isSystemAdmin"></p-checkbox>
                </td>
                <td class="text-center">
                  <p-checkbox [(ngModel)]="p.canCreate" [binary]="true" [disabled]="selectedRole.name === 'SystemAdmin' || !isSystemAdmin"></p-checkbox>
                </td>
                <td class="text-center">
                  <p-checkbox [(ngModel)]="p.canEdit" [binary]="true" [disabled]="selectedRole.name === 'SystemAdmin' || !isSystemAdmin"></p-checkbox>
                </td>
                <td class="text-center">
                  <p-checkbox [(ngModel)]="p.canDelete" [binary]="true" [disabled]="selectedRole.name === 'SystemAdmin' || !isSystemAdmin"></p-checkbox>
                </td>
                <td class="text-center">
                  <button class="row-set-btn" [class.all-set]="isRowAllSet(p)" (click)="toggleRow(p)" [disabled]="selectedRole.name === 'SystemAdmin' || !isSystemAdmin">
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
    
    .page-title { font-size: 1.05rem !important; margin: 0; font-weight: 800; color: #1e293b; line-height: 1.2; }
    .page-sub { margin: 0; color: #94a3b8; font-weight: 500; font-size: 0.75rem; }

    .sidebar-card::-webkit-scrollbar, .main-card::-webkit-scrollbar { width: 6px; }
    .sidebar-card::-webkit-scrollbar-track, .main-card::-webkit-scrollbar-track { background: transparent; }
    .sidebar-card::-webkit-scrollbar-thumb, .main-card::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .sidebar-card::-webkit-scrollbar-thumb:hover, .main-card::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    .sidebar-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; overflow-y: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .main-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 0 !important; overflow-y: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); position: relative; }
    
    .content-grid { display: grid; grid-template-columns: 1fr 3fr; gap: 1.25rem; flex: 1; overflow: hidden; padding: 1rem 1.25rem; }
    @media (max-width: 991px) {
      .content-grid { grid-template-columns: 1fr; overflow-y: auto; height: auto; display: flex; flex-direction: column; }
      .sidebar-card { max-height: 300px; min-height: 200px; }
      .main-card { min-height: 500px; }
      .page-wrap { height: auto; min-height: calc(100vh - 70px); }
    }
    
    .section-title { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.25rem; }
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
    .role-name { font-weight: 800; font-size: 0.95rem; color: #1e293b; }
    .selected-role .role-name { color: #0d9488; }
    .role-stats { color: #64748b; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
    .selected-role .role-stats { color: #0d9488aa; }

    /* Matrix Table UI */
    .matrix-header { display: flex; justify-content: space-between; align-items: flex-end; }
    .matrix-table { border-radius: 12px; overflow: hidden; }
    ::ng-deep .matrix-table .p-datatable-tbody > tr > td { padding: 14px 12px !important; border-bottom: 1px solid #f1f5f9; }
    ::ng-deep .matrix-table .p-datatable-tbody > tr:hover { background: #fcfcfc !important; }
    
    ::ng-deep .matrix-table .p-datatable-thead > tr > th { 
      background: #f1f5f9 !important; color: #0d9488 !important; font-size: 0.75rem !important; 
      border-bottom: 2.5px solid #0d9488 !important; padding: 12px 12px !important; 
      text-transform: uppercase; letter-spacing: 0.8px !important; font-weight: 900;
      position: sticky; top: 0; z-index: 5;
    }
    
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
    
    .compact-search-inline { width: 100px; position: relative; display: flex; align-items: center; }
    .search-icon-sm { position: absolute; left: 8px; color: #94a3b8; font-size: 0.7rem; pointer-events: none; }
    .search-field-sm { width: 100%; padding: 4px 8px 4px 26px !important; border-radius: 6px !important; border: 1px solid #e2e8f0 !important; background: #f8fafc !important; font-size: 0.75rem !important; height: 26px !important; }
    .search-field-sm:focus { background: #fff !important; border-color: #0d9488 !important; }
    
    .unified-header-row th { 
      background: #ffffff !important; 
      position: sticky !important; top: 0 !important; z-index: 1000 !important;
      border-bottom: 2px solid #0d948830 !important;
      padding: 6px 10px !important;
      box-shadow: 0 4px 12px -4px rgba(0,0,0,0.1);
    }

    ::ng-deep .p-checkbox .p-checkbox-box { border-radius: 6px; border-width: 2px; transition: all 0.2s; }
    ::ng-deep .p-checkbox .p-checkbox-box.p-highlight { background: #0d9488 !important; border-color: #0d9488 !important; }
    ::ng-deep .p-checkbox:not(.p-checkbox-disabled) .p-checkbox-box:hover { border-color: #0d9488 !important; }

    /* Matrix Table UI - Sticky Header Fix */
    .matrix-table { border-radius: 0; }
    ::ng-deep .matrix-table .p-datatable-wrapper { padding: 0 1.5rem 1rem 1.5rem; background: #fff; border-radius: 0 0 16px 16px; min-height: 100%; border-top: 1px solid #f1f5f9; }
    ::ng-deep .matrix-table .p-datatable-thead > tr > th { 
      background: #f1f5f9 !important; color: #0d9488 !important; font-size: 0.75rem !important; 
      border-bottom: 2.5px solid #0d9488 !important; padding: 10px 10px !important; 
      text-transform: uppercase; letter-spacing: 0.8px !important; font-weight: 900;
      position: sticky !important; top: 40px !important; z-index: 100 !important;
      box-shadow: 0 4px 6px -4px rgba(0,0,0,0.1);
      opacity: 1 !important;
    }
    /* SystemAdmin UI Protection Styles */
    .sysadmin-banner {
      background: linear-gradient(135deg, #fef3c7, #fffbeb); border: 1.5px solid #fde68a;
      border-radius: 10px; padding: 10px 16px; margin: 12px 16px 0;
      font-size: 0.8rem; color: #92400e; display: flex; align-items: center;
    }
    .sysadmin-role-row { background: #fffbeb !important; border-color: #fde68a !important; }
    .sysadmin-role-badge {
      font-size: 0.55rem; font-weight: 900; padding: 1px 6px; border-radius: 4px;
      background: #fef3c7; color: #b45309; border: 1px solid #fde68a; letter-spacing: 0.05em;
    }
    .crown-icon { font-size: 0.85rem; }

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
    { name: 'Sales Reports', icon: 'pi-file-pdf' },
    { name: 'Purchase Reports', icon: 'pi-file-excel' },
    { name: 'Inventory Reports', icon: 'pi-database' },
    { name: 'Financial Reports', icon: 'pi-dollar' },
    { name: 'Expiry Reports', icon: 'pi-calendar-times' },
    { name: 'Top Selling Reports', icon: 'pi-star' },
    { name: 'Low Stock Reports', icon: 'pi-exclamation-triangle' },
    { name: 'Ledger Reports', icon: 'pi-book' },
    { name: 'User Performance Reports', icon: 'pi-chart-bar' },
    { name: 'VAT Reports', icon: 'pi-percentage' },
    { name: 'Users', icon: 'pi-user-edit' },
    { name: 'Roles', icon: 'pi-shield' },
    { name: 'Settings', icon: 'pi-cog' },
    { name: 'Master Data', icon: 'pi-list' }
  ];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  get isSystemAdmin(): boolean {
    return this.authService.isSystemAdmin();
  }

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
    // Block reserved name at UI level too
    if (this.newRoleName.trim().toLowerCase() === 'systemadmin') {
      this.messageService.add({ severity: 'error', summary: 'Reserved Name', detail: '"SystemAdmin" is a protected role name and cannot be used.' });
      this.newRoleName = '';
      return;
    }
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

  navigateBack() {
    this.router.navigate(['/dashboard/users']);
  }

  /** Block typing 'SystemAdmin' in the create role input */
  blockReservedRoleName() {
    if (this.newRoleName.trim().toLowerCase() === 'systemadmin') {
      this.newRoleName = '';
      this.messageService.add({ severity: 'warn', summary: 'Reserved', detail: '"SystemAdmin" is a reserved role name.' });
    }
  }

  hasPermission(mod: string, act: 'view' | 'create' | 'edit' | 'delete' = 'view') {
    return this.authService.hasPermission(mod, act);
  }
}
