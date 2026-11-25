using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-02 invariants:
/// - Anonymous login resolves Tenant-scoped RolePermissions instead of empty []
/// - Cross-tenant RolePermission isolation is strictly enforced
/// - SystemAdmin updates require an explicit positive TenantId and never corrupt other tenants
/// </summary>
public class UserManagementPermissionTests
{
    private sealed class StubTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;
    }

    private static (ServiceProvider Provider, ApplicationDbContext Db, UserManager<ApplicationUser> Users, RoleManager<IdentityRole> Roles, IUserManagementService Svc)
        CreateScopeWithContext(StubTenantContext ctx, string dbName)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddScoped<ITenantContextService>(_ => ctx);
        services.AddDbContext<ApplicationDbContext>(opts => opts.UseInMemoryDatabase(dbName));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddScoped<IUserManagementService, UserManagementService>();

        var provider = services.BuildServiceProvider();
        var db = provider.GetRequiredService<ApplicationDbContext>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var svc = provider.GetRequiredService<IUserManagementService>();

        return (provider, db, userMgr, roleMgr, svc);
    }

    private static async Task SeedRolesAndUsersAsync(
        RoleManager<IdentityRole> roleMgr,
        UserManager<ApplicationUser> userMgr)
    {
        foreach (var roleName in new[] { "SystemAdmin", "Admin", "Manager", "Cashier" })
        {
            if (!await roleMgr.RoleExistsAsync(roleName))
                await roleMgr.CreateAsync(new IdentityRole(roleName));
        }

        async Task CreateUser(string id, string userName, int? tenantId, int? branchId, string role)
        {
            var user = new ApplicationUser
            {
                Id = id,
                UserName = userName,
                Email = $"{userName}@test.local",
                FullName = userName,
                TenantId = tenantId,
                BranchId = branchId,
                IsActive = true
            };
            var res = await userMgr.CreateAsync(user, "Test@12345");
            Assert.True(res.Succeeded, string.Join(",", res.Errors.Select(e => e.Description)));
            await userMgr.AddToRoleAsync(user, role);
        }

        await CreateUser("u-sys", "sysadmin1", null, null, "SystemAdmin");
        await CreateUser("u-t1-adm", "t1admin", 1, null, "Admin");
        await CreateUser("u-t1-mgr", "t1manager", 1, 1, "Manager");
        await CreateUser("u-t2-mgr", "t2manager", 2, 2, "Manager");
        await CreateUser("u-orphan", "orphanmgr", null, null, "Manager");
    }

    [Fact]
    public async Task GetEffectivePermissionsAsync_DuringAnonymousLogin_ReturnsTenantPermissionsForNonSystemAdmin()
    {
        var dbName = Guid.NewGuid().ToString();
        var loginCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = null, BranchId = null };
        using var setup = CreateScopeWithContext(loginCtx, dbName).Provider;

        var db = setup.GetRequiredService<ApplicationDbContext>();
        var roleMgr = setup.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = setup.GetRequiredService<UserManager<ApplicationUser>>();
        var svc = setup.GetRequiredService<IUserManagementService>();

        await SeedRolesAndUsersAsync(roleMgr, userMgr);
        var adminRole = await roleMgr.FindByNameAsync("Admin");
        Assert.NotNull(adminRole);

        db.RolePermissions.Add(new RolePermission
        {
            TenantId = 1,
            RoleId = adminRole!.Id,
            ModuleName = "Sales",
            CanView = true,
            CanCreate = true,
            CanEdit = true,
            CanDelete = false
        });
        await db.SaveChangesAsync();

        var effective = (await svc.GetEffectivePermissionsAsync("u-t1-adm")).ToList();

        Assert.Single(effective);
        Assert.Equal("Sales", effective[0].ModuleName);
        Assert.True(effective[0].CanView);
        Assert.True(effective[0].CanCreate);
        Assert.True(effective[0].CanEdit);
        Assert.False(effective[0].CanDelete);
    }

    [Fact]
    public async Task GetEffectivePermissionsAsync_EnforcesTenantIsolation_DoesNotLeakOtherTenantPermissions()
    {
        var dbName = Guid.NewGuid().ToString();
        var loginCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = null };
        using var provider = CreateScopeWithContext(loginCtx, dbName).Provider;

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var svc = provider.GetRequiredService<IUserManagementService>();

        await SeedRolesAndUsersAsync(roleMgr, userMgr);
        var managerRole = await roleMgr.FindByNameAsync("Manager");
        Assert.NotNull(managerRole);

        db.RolePermissions.AddRange(
            new RolePermission { TenantId = 1, RoleId = managerRole!.Id, ModuleName = "Sales", CanView = true },
            new RolePermission { TenantId = 2, RoleId = managerRole.Id, ModuleName = "Financial Reports", CanView = true, CanDelete = true }
        );
        await db.SaveChangesAsync();

        var t1Perms = (await svc.GetEffectivePermissionsAsync("u-t1-mgr")).ToList();

        Assert.Single(t1Perms);
        Assert.Equal("Sales", t1Perms[0].ModuleName);
        Assert.DoesNotContain(t1Perms, p => p.ModuleName == "Financial Reports");
    }

    [Fact]
    public async Task GetEffectivePermissionsAsync_NullTenantNonSystemAdmin_ReturnsEmptyEvenIfZeroTenantRowExists()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new StubTenantContext { IsSystemAdmin = false, TenantId = null };
        using var provider = CreateScopeWithContext(ctx, dbName).Provider;

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var svc = provider.GetRequiredService<IUserManagementService>();

        await SeedRolesAndUsersAsync(roleMgr, userMgr);
        var managerRole = await roleMgr.FindByNameAsync("Manager");

        db.RolePermissions.Add(new RolePermission
        {
            TenantId = 0,
            RoleId = managerRole!.Id,
            ModuleName = "Users",
            CanView = true,
            CanDelete = true
        });
        await db.SaveChangesAsync();

        var orphanPerms = await svc.GetEffectivePermissionsAsync("u-orphan");
        Assert.Empty(orphanPerms);
    }

    [Fact]
    public async Task GetEffectivePermissionsAsync_SystemAdmin_ReturnsAllModulesWithFullAccess()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new StubTenantContext { IsSystemAdmin = false, TenantId = null };
        using var provider = CreateScopeWithContext(ctx, dbName).Provider;

        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var svc = provider.GetRequiredService<IUserManagementService>();

        await SeedRolesAndUsersAsync(roleMgr, userMgr);

        var sysPerms = (await svc.GetEffectivePermissionsAsync("u-sys")).ToList();
        Assert.NotEmpty(sysPerms);
        Assert.All(sysPerms, p =>
        {
            Assert.True(p.CanView);
            Assert.True(p.CanCreate);
            Assert.True(p.CanEdit);
            Assert.True(p.CanDelete);
        });
    }

    [Fact]
    public async Task UpdatePermissionsAsync_SystemAdminWithExplicitTenantId_SetsTenantIdAndPreservesOtherTenants()
    {
        var dbName = Guid.NewGuid().ToString();
        var sysCtx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using var provider = CreateScopeWithContext(sysCtx, dbName).Provider;

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var svc = provider.GetRequiredService<IUserManagementService>();

        await SeedRolesAndUsersAsync(roleMgr, userMgr);
        var cashierRole = await roleMgr.FindByNameAsync("Cashier");

        db.RolePermissions.AddRange(
            new RolePermission { TenantId = 1, RoleId = cashierRole!.Id, ModuleName = "Sales", CanView = false },
            new RolePermission { TenantId = 2, RoleId = cashierRole.Id, ModuleName = "Sales", CanView = true, CanCreate = true }
        );
        await db.SaveChangesAsync();

        await svc.UpdatePermissionsAsync(cashierRole.Id, new[]
        {
            new PermissionDto { RoleId = cashierRole.Id, ModuleName = "Sales", CanView = true, CanCreate = false },
            new PermissionDto { RoleId = cashierRole.Id, ModuleName = "Medicines", CanView = true }
        }, tenantId: 1);

        var t1Rows = await db.RolePermissions.IgnoreQueryFilters()
            .Where(p => p.RoleId == cashierRole.Id && p.TenantId == 1).ToListAsync();
        var t2Rows = await db.RolePermissions.IgnoreQueryFilters()
            .Where(p => p.RoleId == cashierRole.Id && p.TenantId == 2).ToListAsync();
        var zeroRows = await db.RolePermissions.IgnoreQueryFilters()
            .Where(p => p.TenantId == 0).ToListAsync();

        Assert.Equal(2, t1Rows.Count);
        Assert.Empty(zeroRows);
        Assert.Single(t2Rows);
        Assert.True(t2Rows[0].CanCreate);
    }

    [Fact]
    public async Task UpdatePermissionsAsync_SystemAdminWithoutTenantId_ThrowsArgumentException()
    {
        var dbName = Guid.NewGuid().ToString();
        var sysCtx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using var provider = CreateScopeWithContext(sysCtx, dbName).Provider;

        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var svc = provider.GetRequiredService<IUserManagementService>();

        await SeedRolesAndUsersAsync(roleMgr, userMgr);
        var cashierRole = await roleMgr.FindByNameAsync("Cashier");

        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.UpdatePermissionsAsync(cashierRole!.Id, Array.Empty<PermissionDto>(), tenantId: null));
    }

    [Fact]
    public async Task UpdatePermissionsAsync_NonSystemAdminCannotOverrideTenantId()
    {
        var dbName = Guid.NewGuid().ToString();
        var t1AdminCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1 };
        using var provider = CreateScopeWithContext(t1AdminCtx, dbName).Provider;

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var svc = provider.GetRequiredService<IUserManagementService>();

        await SeedRolesAndUsersAsync(roleMgr, userMgr);
        var cashierRole = await roleMgr.FindByNameAsync("Cashier");

        db.RolePermissions.Add(new RolePermission
        {
            TenantId = 2,
            RoleId = cashierRole!.Id,
            ModuleName = "Parties",
            CanView = true
        });
        await db.SaveChangesAsync();

        await svc.UpdatePermissionsAsync(cashierRole.Id, new[]
        {
            new PermissionDto { RoleId = cashierRole.Id, ModuleName = "Sales", CanView = true }
        }, tenantId: 2);

        var t1Rows = await db.RolePermissions.IgnoreQueryFilters().Where(p => p.TenantId == 1).ToListAsync();
        var t2Rows = await db.RolePermissions.IgnoreQueryFilters().Where(p => p.TenantId == 2).ToListAsync();

        Assert.Single(t1Rows);
        Assert.Equal("Sales", t1Rows[0].ModuleName);
        Assert.Single(t2Rows);
        Assert.Equal("Parties", t2Rows[0].ModuleName);
    }

    [Fact]
    public async Task SeedDefaultPermissionsForTenantAsync_SeedsDefaultsAndIsIdempotent()
    {
        var dbName = Guid.NewGuid().ToString();
        var sysCtx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using var provider = CreateScopeWithContext(sysCtx, dbName).Provider;

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var svc = provider.GetRequiredService<IUserManagementService>();

        await SeedRolesAndUsersAsync(roleMgr, userMgr);

        await svc.SeedDefaultPermissionsForTenantAsync(1);
        var firstCount = await db.RolePermissions.IgnoreQueryFilters().CountAsync(p => p.TenantId == 1);
        Assert.True(firstCount > 0);

        await svc.SeedDefaultPermissionsForTenantAsync(1);
        var secondCount = await db.RolePermissions.IgnoreQueryFilters().CountAsync(p => p.TenantId == 1);
        Assert.Equal(firstCount, secondCount);

        var adminPerms = (await svc.GetEffectivePermissionsAsync("u-t1-adm")).ToList();
        Assert.Contains(adminPerms, p => p.ModuleName == "Sales" && p.CanView && p.CanCreate && p.CanEdit && p.CanDelete);
        Assert.DoesNotContain(adminPerms, p => p.ModuleName == "Roles" && p.CanView);

        var mgrPerms = (await svc.GetEffectivePermissionsAsync("u-t1-mgr")).ToList();
        Assert.Contains(mgrPerms, p => p.ModuleName == "Purchases" && p.CanView && p.CanCreate && p.CanEdit && !p.CanDelete);
    }
}
