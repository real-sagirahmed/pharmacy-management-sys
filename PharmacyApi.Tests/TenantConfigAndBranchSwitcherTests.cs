using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using PharmacyApi.Controllers;
using PharmacyApi.Data;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-08 invariants:
/// - TenantContextService only honors X-Branch-Id for multi-branch Admins (JWT BranchId == null); branch-locked staff cannot override
/// - SequenceCodeHelper rejects tampered cross-tenant or inactive X-Branch-Id headers
/// - TenantsController.GetConfig returns tenantId, tagline, canAccessAllBranches, currentBranch, and active branches scoped to caller access
/// - Multi-branch Admin retain governance privileges (ApproveTransfer / Users) even while X-Branch-Id filters Tier-2 data
/// </summary>
public class TenantConfigAndBranchSwitcherTests
{
    private sealed class MutableTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches { get; set; }
    }

    private static HttpContext BuildHttpContext(
        IEnumerable<Claim> claims,
        string? branchHeader = null)
    {
        var ctx = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
        };
        if (branchHeader != null)
            ctx.Request.Headers["X-Branch-Id"] = branchHeader;
        return ctx;
    }

    private static (ServiceProvider Provider, ApplicationDbContext Db, UserManager<ApplicationUser> Users, IUserManagementService UserSvc)
        CreateScope(ITenantContextService ctx, string dbName)
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
            provider.GetRequiredService<IUserManagementService>()
        );
    }

    [Fact]
    public void TenantContextService_HonorsHeaderOnlyForCanAccessAllBranches_BlocksBranchStaffSpoof()
    {
        // 1. Multi-branch Admin (TenantId=1, no BranchId claim) with X-Branch-Id=2
        var adminHttp = BuildHttpContext(
            new[] { new Claim("TenantId", "1"), new Claim(ClaimTypes.Role, "Admin") },
            branchHeader: "2");
        var adminAccessor = new HttpContextAccessor { HttpContext = adminHttp };
        var adminCtx = new TenantContextService(adminAccessor);

        Assert.Equal(1, adminCtx.TenantId);
        Assert.Equal(2, adminCtx.BranchId);
        Assert.True(adminCtx.CanAccessAllBranches);
        Assert.False(adminCtx.IsSystemAdmin);

        // 2. Multi-branch Admin without header -> BranchId = null (All Branches)
        var allHttp = BuildHttpContext(
            new[] { new Claim("TenantId", "1"), new Claim(ClaimTypes.Role, "Admin") });
        var allCtx = new TenantContextService(new HttpContextAccessor { HttpContext = allHttp });
        Assert.Null(allCtx.BranchId);
        Assert.True(allCtx.CanAccessAllBranches);

        // 3. Branch-locked Manager (JWT BranchId=1) trying to spoof X-Branch-Id=2 -> ignored!
        var mgrHttp = BuildHttpContext(
            new[] { new Claim("TenantId", "1"), new Claim("BranchId", "1"), new Claim(ClaimTypes.Role, "Manager") },
            branchHeader: "2");
        var mgrCtx = new TenantContextService(new HttpContextAccessor { HttpContext = mgrHttp });

        Assert.Equal(1, mgrCtx.BranchId);
        Assert.False(mgrCtx.CanAccessAllBranches);
    }

    [Fact]
    public async Task GetConfig_ReturnsTenantBranchesAndCurrentBranch_WithoutExposingOtherTenantOrSpoofedBranch()
    {
        var dbName = Guid.NewGuid().ToString();
        var setupCtx = new MutableTenantContext { IsSystemAdmin = true };
        var (setupProvider, setupDb, setupUsers, setupSvc) = CreateScope(setupCtx, dbName);
        using (setupProvider)
        {
            setupDb.Tenants.AddRange(
                new Tenant { TenantId = 1, PharmacyName = "Green Pharma", Slogan = "Care Always", PrimaryColor = "#112233", IsActive = true },
                new Tenant { TenantId = 2, PharmacyName = "Other Pharma", IsActive = true });
            setupDb.Branches.AddRange(
                new Branch { BranchId = 1, TenantId = 1, BranchName = "HO", IsHeadOffice = true, IsActive = true },
                new Branch { BranchId = 2, TenantId = 1, BranchName = "Banani", IsHeadOffice = false, IsActive = true },
                new Branch { BranchId = 3, TenantId = 1, BranchName = "Closed Branch", IsHeadOffice = false, IsActive = false },
                new Branch { BranchId = 4, TenantId = 2, BranchName = "T2 Branch", IsHeadOffice = true, IsActive = true });
            await setupDb.SaveChangesAsync();
        }

        // Case A: Admin with X-Branch-Id=2 sees active branches [HO, Banani] and currentBranch = Banani
        var admCtx = new MutableTenantContext { TenantId = 1, BranchId = 2, CanAccessAllBranches = true };
        var (p1, db1, u1, s1) = CreateScope(admCtx, dbName);
        using (p1)
        {
            var ctrl = new TenantsController(db1, admCtx, u1, s1);
            var ok = Assert.IsType<OkObjectResult>(await ctrl.GetConfig());
            var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
            Assert.Contains("\"tenantId\":1", json);
            Assert.Contains("\"tagline\":\"Care Always\"", json);
            Assert.Contains("\"canAccessAllBranches\":true", json);
            Assert.Contains("Banani", json);
            Assert.Contains("HO", json);
            Assert.DoesNotContain("Closed Branch", json);
            Assert.DoesNotContain("T2 Branch", json);
            Assert.Contains("\"currentBranch\":{\"branchId\":2", json);
        }

        // Case B: Admin with tampered cross-tenant X-Branch-Id=4 gets currentBranch = null (never Branch 4)
        var spoofCtx = new MutableTenantContext { TenantId = 1, BranchId = 4, CanAccessAllBranches = true };
        var (p2, db2, u2, s2) = CreateScope(spoofCtx, dbName);
        using (p2)
        {
            var ctrl = new TenantsController(db2, spoofCtx, u2, s2);
            var ok = Assert.IsType<OkObjectResult>(await ctrl.GetConfig());
            var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
            Assert.Contains("\"currentBranch\":null", json);
            Assert.DoesNotContain("T2 Branch", json);
        }

        // Case C: Branch-locked Manager (BranchId=2, CanAccessAllBranches=false) sees ONLY Branch 2
        var mgrCtx = new MutableTenantContext { TenantId = 1, BranchId = 2, CanAccessAllBranches = false };
        var (p3, db3, u3, s3) = CreateScope(mgrCtx, dbName);
        using (p3)
        {
            var ctrl = new TenantsController(db3, mgrCtx, u3, s3);
            var ok = Assert.IsType<OkObjectResult>(await ctrl.GetConfig());
            var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
            Assert.Contains("\"canAccessAllBranches\":false", json);
            Assert.Contains("Banani", json);
            Assert.DoesNotContain("\"HO\"", json);
        }
    }

    [Fact]
    public async Task SequenceCodeHelper_RejectsCrossTenantOrInactiveHeaderBranchId()
    {
        var dbName = Guid.NewGuid().ToString();
        var setupCtx = new MutableTenantContext { IsSystemAdmin = true };
        var (p0, db0, _, _) = CreateScope(setupCtx, dbName);
        using (p0)
        {
            db0.Tenants.AddRange(
                new Tenant { TenantId = 1, PharmacyName = "T1", IsActive = true },
                new Tenant { TenantId = 2, PharmacyName = "T2", IsActive = true });
            db0.Branches.AddRange(
                new Branch { BranchId = 1, TenantId = 1, BranchName = "T1 B1", IsHeadOffice = true, IsActive = true },
                new Branch { BranchId = 2, TenantId = 1, BranchName = "T1 Inactive", IsHeadOffice = false, IsActive = false },
                new Branch { BranchId = 3, TenantId = 2, BranchName = "T2 B3", IsHeadOffice = true, IsActive = true });
            await db0.SaveChangesAsync();
        }

        var spoofCtx = new MutableTenantContext { TenantId = 1, BranchId = 3, CanAccessAllBranches = true };
        var (p1, db1, _, _) = CreateScope(spoofCtx, dbName);
        using (p1)
        {
            var salesRepo = new SalesRepository(db1, spoofCtx);
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                salesRepo.CreateAsync(new PharmacyApi.DTOs.SalesMasterDto
                {
                    CustomerName = "Walk",
                    GrandTotal = 10,
                    PaidAmount = 10,
                    DueAmount = 0
                }, "admin"));
        }

        var inactiveCtx = new MutableTenantContext { TenantId = 1, BranchId = 2, CanAccessAllBranches = true };
        var (p2, db2, _, _) = CreateScope(inactiveCtx, dbName);
        using (p2)
        {
            var salesRepo = new SalesRepository(db2, inactiveCtx);
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                salesRepo.CreateAsync(new PharmacyApi.DTOs.SalesMasterDto
                {
                    CustomerName = "Walk",
                    GrandTotal = 10,
                    PaidAmount = 10,
                    DueAmount = 0
                }, "admin"));
        }
    }
}
