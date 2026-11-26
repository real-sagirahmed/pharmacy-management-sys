using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using PharmacyApi.Controllers;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-09 invariants:
/// - Cross-tenant & cross-branch IDOR attempts fail closed (UnauthorizedAccessException / 403)
/// - Non-SystemAdmin cannot mutate any SystemAdmin account (even when multiple SystemAdmins exist)
/// - Global AspNetRoles mutations (create/rename/delete) require SystemAdmin and GetRoles counts are Tenant-scoped
/// - AllModules includes Tenants, Branches, BranchTransfer, and Batches cleanly without exposing Tenants to pharmacy Admins
/// </summary>
public class UserTenantIdorAndRoleGovernanceTests
{
    private sealed class StubTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;
    }

    private static (ServiceProvider Provider, ApplicationDbContext Db, UserManager<ApplicationUser> Users, RoleManager<IdentityRole> Roles, IUserManagementService Svc)
        CreateScope(StubTenantContext ctx, string dbName)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection();
        services.AddScoped<ITenantContextService>(_ => ctx);
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseInMemoryDatabase(dbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();
        services.AddScoped<IUserManagementService, UserManagementService>();

        var provider = services.BuildServiceProvider();
        return (
            provider,
            provider.GetRequiredService<ApplicationDbContext>(),
            provider.GetRequiredService<UserManager<ApplicationUser>>(),
            provider.GetRequiredService<RoleManager<IdentityRole>>(),
            provider.GetRequiredService<IUserManagementService>()
        );
    }

    private static async Task SeedMultiTenantSetupAsync(
        ApplicationDbContext db,
        RoleManager<IdentityRole> roleMgr,
        UserManager<ApplicationUser> userMgr)
    {
        foreach (var r in new[] { "SystemAdmin", "Admin", "Manager", "Cashier" })
        {
            if (!await roleMgr.RoleExistsAsync(r))
                await roleMgr.CreateAsync(new IdentityRole(r));
        }

        db.Tenants.AddRange(
            new Tenant { TenantId = 1, PharmacyName = "Pharmacy One", IsActive = true },
            new Tenant { TenantId = 2, PharmacyName = "Pharmacy Two", IsActive = true });
        db.Branches.AddRange(
            new Branch { BranchId = 1, TenantId = 1, BranchName = "T1 Main", IsHeadOffice = true, IsActive = true },
            new Branch { BranchId = 2, TenantId = 1, BranchName = "T1 Gulshan", IsHeadOffice = false, IsActive = true },
            new Branch { BranchId = 3, TenantId = 2, BranchName = "T2 Main", IsHeadOffice = true, IsActive = true });
        await db.SaveChangesAsync();

        var users = new (string Id, string Name, int? TId, int? BId, string Role)[]
        {
            ("sys-1", "sysadmin1", null, null, "SystemAdmin"),
            ("sys-2", "sysadmin2", null, null, "SystemAdmin"),
            ("t1-adm", "t1admin", 1, null, "Admin"),
            ("t1-mgr-b1", "t1mgr1", 1, 1, "Manager"),
            ("t1-cash-b1", "t1cash1", 1, 1, "Cashier"),
            ("t2-adm", "t2admin", 2, null, "Admin"),
            ("t2-mgr", "t2mgr", 2, 3, "Manager")
        };

        foreach (var (id, name, tid, bid, role) in users)
        {
            var u = new ApplicationUser
            {
                Id = id,
                UserName = name,
                Email = $"{name}@test.com",
                FullName = name,
                TenantId = tid,
                BranchId = bid,
                IsActive = true
            };
            Assert.True((await userMgr.CreateAsync(u, "Pass@123!")).Succeeded);
            await userMgr.AddToRoleAsync(u, role);
        }
    }

    [Fact]
    public async Task CrossTenantIdor_BlockedAcrossAllUserMutationEndpoints()
    {
        var dbName = Guid.NewGuid().ToString();
        var t1AdminCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = null };
        var (provider, db, users, roles, svc) = CreateScope(t1AdminCtx, dbName);
        using var _ = provider;

        await SeedMultiTenantSetupAsync(db, roles, users);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.ToggleUserStatusAsync("t2-mgr"));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.DeleteUserAsync("t2-mgr"));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.AssignUserRoleAsync("t2-mgr", "Cashier"));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.IsUserSystemAdminAsync("t2-mgr"));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.UpdateUserAsync("t2-mgr", new UpdateUserDto
        {
            UserName = "hacked",
            FullName = "Hacked",
            Email = "hack@test.com"
        }));

        // Verify Tenant 2 user remained untouched
        var t2Mgr = await users.FindByIdAsync("t2-mgr");
        Assert.NotNull(t2Mgr);
        Assert.True(t2Mgr!.IsActive);
        Assert.Equal("t2mgr", t2Mgr.UserName);
        Assert.True(await users.IsInRoleAsync(t2Mgr, "Manager"));
    }

    [Fact]
    public async Task NonSystemAdmin_CannotMutateSystemAdmin_OrEscalateBranchBoundary()
    {
        var dbName = Guid.NewGuid().ToString();

        // Tenant 1 Admin cannot touch SystemAdmin even when 2 SystemAdmins exist
        var t1AdminCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = null };
        using (var scope = CreateScope(t1AdminCtx, dbName).Provider)
        {
            var db = scope.GetRequiredService<ApplicationDbContext>();
            var users = scope.GetRequiredService<UserManager<ApplicationUser>>();
            var roles = scope.GetRequiredService<RoleManager<IdentityRole>>();
            var svc = scope.GetRequiredService<IUserManagementService>();
            await SeedMultiTenantSetupAsync(db, roles, users);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.ToggleUserStatusAsync("sys-2"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.DeleteUserAsync("sys-2"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.AssignUserRoleAsync("sys-2", "Cashier"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.IsUserSystemAdminAsync("sys-2"));
        }

        // Branch-locked Manager (BranchId=1) cannot touch All-Branch Admin (BranchId=null) or create Admin
        var t1BranchMgrCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = 1 };
        using (var branchScope = CreateScope(t1BranchMgrCtx, dbName).Provider)
        {
            var svc = branchScope.GetRequiredService<IUserManagementService>();

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.ToggleUserStatusAsync("t1-adm"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.AssignUserRoleAsync("t1-cash-b1", "Admin"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.CreateUserAsync(new CreateUserDto
            {
                UserName = "rogue_admin",
                Email = "rogue@test.com",
                FullName = "Rogue",
                Password = "Password@123",
                Role = "Admin"
            }));

            // Branch Manager CAN list only Branch 1 staff (excludes Tenant Admin BranchId=null and Tenant 2)
            var visibleUsers = (await svc.GetAllUsersAsync()).ToList();
            Assert.All(visibleUsers, u => Assert.Equal(1, u.BranchId));
            Assert.DoesNotContain(visibleUsers, u => u.Id == "t1-adm" || u.Id == "t2-mgr");
        }
    }

    [Fact]
    public async Task CrossTenantBranchInjection_RejectedOnCreateAndUpdate()
    {
        var dbName = Guid.NewGuid().ToString();
        var t1AdminCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = null };
        var (provider, db, users, roles, svc) = CreateScope(t1AdminCtx, dbName);
        using var _ = provider;

        await SeedMultiTenantSetupAsync(db, roles, users);

        // Tenant 1 Admin tries to create user under Tenant 2's BranchId=3
        var createBad = await svc.CreateUserAsync(new CreateUserDto
        {
            UserName = "cross_branch",
            Email = "cb@test.com",
            FullName = "CB",
            Password = "Password@123",
            Role = "Cashier",
            TenantId = 2, // Ignored -> forced to Tenant 1
            BranchId = 3  // Belongs to Tenant 2 -> rejected!
        });
        Assert.False(createBad.Succeeded);

        // Tenant 1 Admin tries to move T1 Cashier into T2 BranchId=3
        var updBad = await svc.UpdateUserAsync("t1-cash-b1", new UpdateUserDto
        {
            UserName = "t1cash1",
            FullName = "Cashier Updated",
            Email = "t1cash1@test.com",
            BranchId = 3
        });
        Assert.False(updBad.Succeeded);

        // Tenant 1 Admin CAN move T1 Cashier into valid T1 BranchId=2
        var updOk = await svc.UpdateUserAsync("t1-cash-b1", new UpdateUserDto
        {
            UserName = "t1cash1",
            FullName = "Cashier Updated",
            Email = "t1cash1@test.com",
            BranchId = 2
        });
        Assert.True(updOk.Succeeded);
        Assert.Equal(2, (await users.FindByIdAsync("t1-cash-b1"))!.BranchId);
    }

    [Fact]
    public async Task GlobalRolesMutations_LockedToSystemAdmin_AndGetRolesCountsScopedPerTenant()
    {
        // 1. Verify controller [Authorize(Roles = "SystemAdmin")] lock on global role endpoints
        var ctrlType = typeof(UsersController);
        foreach (var actionName in new[]
        {
            nameof(UsersController.CreateRole),
            nameof(UsersController.UpdateRoleName),
            nameof(UsersController.DeleteRole)
        })
        {
            var attr = ctrlType.GetMethod(actionName)!.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(attr);
            Assert.Equal("SystemAdmin", attr!.Roles);
        }

        // 2. Verify service-level lock + tenant-scoped counts
        var dbName = Guid.NewGuid().ToString();
        var t1AdminCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1 };
        using (var t1Provider = CreateScope(t1AdminCtx, dbName).Provider)
        {
            var db = t1Provider.GetRequiredService<ApplicationDbContext>();
            var users = t1Provider.GetRequiredService<UserManager<ApplicationUser>>();
            var roles = t1Provider.GetRequiredService<RoleManager<IdentityRole>>();
            var svc = t1Provider.GetRequiredService<IUserManagementService>();
            await SeedMultiTenantSetupAsync(db, roles, users);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.CreateRoleAsync("CustomRole"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.UpdateRoleAsync("any-id", "Renamed"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.DeleteRoleAsync("any-id"));

            var t1Roles = (await svc.GetRolesAsync()).ToList();
            Assert.DoesNotContain(t1Roles, r => r.Name == "SystemAdmin");
            Assert.Equal(1, t1Roles.Single(r => r.Name == "Admin").UserCount);
            Assert.Equal(1, t1Roles.Single(r => r.Name == "Manager").UserCount);
            Assert.Equal(1, t1Roles.Single(r => r.Name == "Cashier").UserCount);
        }

        // SystemAdmin inspecting Tenant 2 sees SystemAdmin + Tenant 2 counts only (0 Cashiers in T2)
        var sysCtx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using (var sysProvider = CreateScope(sysCtx, dbName).Provider)
        {
            var svc = sysProvider.GetRequiredService<IUserManagementService>();
            var t2Roles = (await svc.GetRolesAsync(tenantId: 2)).ToList();
            Assert.Contains(t2Roles, r => r.Name == "SystemAdmin");
            Assert.Equal(1, t2Roles.Single(r => r.Name == "Admin").UserCount);
            Assert.Equal(1, t2Roles.Single(r => r.Name == "Manager").UserCount);
            Assert.Equal(0, t2Roles.Single(r => r.Name == "Cashier").UserCount);
        }
    }

    [Fact]
    public async Task AllModules_IncludesNewSaasModules_AndProtectsTenantsFromNonSystemAdmin()
    {
        var dbName = Guid.NewGuid().ToString();
        var t1Ctx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1 };
        var (provider, db, users, roles, svc) = CreateScope(t1Ctx, dbName);
        using var _ = provider;

        await SeedMultiTenantSetupAsync(db, roles, users);
        await svc.SeedDefaultPermissionsForTenantAsync(1);

        // SystemAdmin gets all 26 modules including Tenants, Branches, BranchTransfer, Batches
        var sysPerms = (await svc.GetEffectivePermissionsAsync("sys-1")).ToList();
        Assert.Equal(26, sysPerms.Count);
        Assert.Contains(sysPerms, p => p.ModuleName == "Tenants" && p.CanView);
        Assert.Contains(sysPerms, p => p.ModuleName == "Branches" && p.CanView);
        Assert.Contains(sysPerms, p => p.ModuleName == "BranchTransfer" && p.CanView);
        Assert.Contains(sysPerms, p => p.ModuleName == "Batches" && p.CanView);

        // Tenant Admin gets Branches, BranchTransfer, Batches (NOT Roles or Tenants)
        var admPerms = (await svc.GetEffectivePermissionsAsync("t1-adm")).ToList();
        Assert.Contains(admPerms, p => p.ModuleName == "Branches" && p.CanView && p.CanCreate && p.CanEdit && p.CanDelete);
        Assert.Contains(admPerms, p => p.ModuleName == "BranchTransfer" && p.CanView && p.CanCreate);
        Assert.Contains(admPerms, p => p.ModuleName == "Batches" && p.CanView && p.CanCreate);
        Assert.DoesNotContain(admPerms, p => p.ModuleName == "Roles" && p.CanView);
        Assert.DoesNotContain(admPerms, p => p.ModuleName == "Tenants" && p.CanView);

        // Branch Manager gets Branches (View only), BranchTransfer & Batches (View/Create/Edit)
        var mgrPerms = (await svc.GetEffectivePermissionsAsync("t1-mgr-b1")).ToList();
        var mgrBranches = mgrPerms.Single(p => p.ModuleName == "Branches");
        Assert.True(mgrBranches.CanView);
        Assert.False(mgrBranches.CanCreate);
        Assert.False(mgrBranches.CanDelete);
        Assert.Contains(mgrPerms, p => p.ModuleName == "BranchTransfer" && p.CanView && p.CanCreate && p.CanEdit && !p.CanDelete);
        Assert.Contains(mgrPerms, p => p.ModuleName == "Batches" && p.CanView && p.CanCreate && p.CanEdit && !p.CanDelete);

        // Non-SystemAdmin cannot grant Tenants permission via UpdatePermissionsAsync
        var mgrRole = await roles.FindByNameAsync("Manager");
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.UpdatePermissionsAsync(mgrRole!.Id, new[]
        {
            new PermissionDto { RoleId = mgrRole.Id, ModuleName = "Tenants", CanView = true }
        }));
    }
}
