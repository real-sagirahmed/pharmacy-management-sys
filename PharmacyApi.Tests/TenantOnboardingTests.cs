using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using PharmacyApi.Controllers;
using PharmacyApi.Data;
using PharmacyApi.Models;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-07 invariants:
/// - Newly onboarded Tenant always gets isolated default RolePermissions (Admin/Manager/Cashier)
/// - Initial Tenant Admin gets TenantId = tenant.TenantId, BranchId = null, and working login permissions
/// - Partial/duplicate Admin inputs reject cleanly without creating users
/// </summary>
public class TenantOnboardingTests
{
    private sealed class StubTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;
    }

    private static ServiceProvider CreateProvider(StubTenantContext ctx, string dbName)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddScoped<ITenantContextService>(_ => ctx);
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseInMemoryDatabase(dbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        return services.BuildServiceProvider();
    }

    private static async Task SeedCoreRolesAsync(RoleManager<IdentityRole> roleMgr)
    {
        foreach (var roleName in new[] { "SystemAdmin", "Admin", "Manager", "Cashier" })
        {
            if (!await roleMgr.RoleExistsAsync(roleName))
                await roleMgr.CreateAsync(new IdentityRole(roleName));
        }
    }

    [Fact]
    public async Task Create_WithoutAdminCredentials_SeedsDefaultRolePermissionsForNewTenant()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using var provider = CreateProvider(ctx, dbName);

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var userSvc = provider.GetRequiredService<IUserManagementService>();

        await SeedCoreRolesAsync(roleMgr);

        var controller = new TenantsController(db, ctx, userMgr, userSvc);
        var result = await controller.Create(new CreateTenantDto
        {
            PharmacyName = "Dhaka Medico",
            Address = "Mirpur-10, Dhaka",
            Phone = "01712345678",
            PrimaryColor = "#007070"
        });

        Assert.IsType<CreatedAtActionResult>(result);
        var tenant = await db.Tenants.IgnoreQueryFilters().SingleAsync();

        var adminRole = await roleMgr.FindByNameAsync("Admin");
        var managerRole = await roleMgr.FindByNameAsync("Manager");
        var cashierRole = await roleMgr.FindByNameAsync("Cashier");

        var perms = await db.RolePermissions.IgnoreQueryFilters()
            .Where(p => p.TenantId == tenant.TenantId)
            .ToListAsync();

        Assert.NotEmpty(perms);
        Assert.Contains(perms, p => p.RoleId == adminRole!.Id && p.ModuleName == "Sales" && p.CanView && p.CanDelete);
        Assert.Contains(perms, p => p.RoleId == adminRole!.Id && p.ModuleName == "Roles" && !p.CanView);
        Assert.Contains(perms, p => p.RoleId == managerRole!.Id && p.ModuleName == "Purchases" && p.CanCreate && !p.CanDelete);
        Assert.Contains(perms, p => p.RoleId == cashierRole!.Id && p.ModuleName == "Sales" && p.CanCreate);
        Assert.Empty(await db.Users.ToListAsync());
    }

    [Fact]
    public async Task Create_WithAdminCredentials_CreatesAdminOwnerWithNullBranchIdAndWorkingLoginPermissions()
    {
        var dbName = Guid.NewGuid().ToString();
        var sysCtx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using var provider = CreateProvider(sysCtx, dbName);

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var userSvc = provider.GetRequiredService<IUserManagementService>();

        await SeedCoreRolesAsync(roleMgr);

        var controller = new TenantsController(db, sysCtx, userMgr, userSvc);
        var result = await controller.Create(new CreateTenantDto
        {
            PharmacyName = "Rahim Pharmacy",
            Address = "Uttara, Dhaka",
            Phone = "01812345678",
            AdminFullName = "Abdur Rahim",
            AdminUserName = "rahim_owner",
            AdminEmail = "rahim@pharma.test",
            AdminPassword = "Rahim@12345"
        });

        Assert.IsType<CreatedAtActionResult>(result);
        var tenant = await db.Tenants.IgnoreQueryFilters().SingleAsync();
        var adminUser = await userMgr.FindByNameAsync("rahim_owner");

        Assert.NotNull(adminUser);
        Assert.Equal(tenant.TenantId, adminUser!.TenantId);
        Assert.Null(adminUser.BranchId); // ARCHITECTURAL INTENT: Owner sees all branches
        Assert.True(adminUser.IsActive);
        Assert.True(adminUser.EmailConfirmed);
        Assert.True(await userMgr.IsInRoleAsync(adminUser, "Admin"));

        // Verify unauthenticated /api/Auth/login context resolves Admin permissions cleanly
        var anonCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = null, BranchId = null };
        using var loginProvider = CreateProvider(anonCtx, dbName);
        var loginUserSvc = loginProvider.GetRequiredService<IUserManagementService>();

        var effective = (await loginUserSvc.GetEffectivePermissionsAsync(adminUser.Id)).ToList();
        Assert.NotEmpty(effective);
        Assert.Contains(effective, p => p.ModuleName == "Sales" && p.CanView && p.CanCreate && p.CanEdit && p.CanDelete);
        Assert.DoesNotContain(effective, p => p.ModuleName == "Roles" && p.CanView);
    }

    [Fact]
    public async Task Create_PartialAdminCredentials_ReturnsBadRequestWithoutCreatingTenant()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using var provider = CreateProvider(ctx, dbName);

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var userSvc = provider.GetRequiredService<IUserManagementService>();

        await SeedCoreRolesAsync(roleMgr);

        var controller = new TenantsController(db, ctx, userMgr, userSvc);
        var result = await controller.Create(new CreateTenantDto
        {
            PharmacyName = "Incomplete Pharma",
            AdminUserName = "missing_email_pass"
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(await db.Tenants.IgnoreQueryFilters().ToListAsync());
        Assert.Empty(await db.Branches.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task Create_DuplicateAdminUsernameOrEmail_ReturnsBadRequest()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using var provider = CreateProvider(ctx, dbName);

        var db = provider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var userSvc = provider.GetRequiredService<IUserManagementService>();

        await SeedCoreRolesAsync(roleMgr);
        await userMgr.CreateAsync(new ApplicationUser
        {
            UserName = "taken_user",
            Email = "taken@pharma.test",
            FullName = "Existing User",
            TenantId = 1
        }, "Test@12345");

        var controller = new TenantsController(db, ctx, userMgr, userSvc);

        var dupUserRes = await controller.Create(new CreateTenantDto
        {
            PharmacyName = "Dup User Pharma",
            AdminUserName = "taken_user",
            AdminEmail = "new@pharma.test",
            AdminPassword = "Test@12345"
        });
        Assert.IsType<BadRequestObjectResult>(dupUserRes);

        var dupEmailRes = await controller.Create(new CreateTenantDto
        {
            PharmacyName = "Dup Email Pharma",
            AdminUserName = "fresh_user",
            AdminEmail = "taken@pharma.test",
            AdminPassword = "Test@12345"
        });
        Assert.IsType<BadRequestObjectResult>(dupEmailRes);
        Assert.Null(await userMgr.FindByNameAsync("fresh_user"));
    }
}
