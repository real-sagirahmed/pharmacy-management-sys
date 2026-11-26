using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using PharmacyApi.Controllers;
using PharmacyApi.Data;
using PharmacyApi.Filters;
using PharmacyApi.Models;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-20 & GAP-18 invariants:
/// - BatchesController scopes batch listing to Tenant/Branch and locks Recall/Quarantine mutations to SystemAdmin/Admin
/// - Cross-tenant UpdateStatus probes fail closed (404 NotFound); invalid status rejected with 400 BadRequest
/// - TenantsController.UploadLogo blocks spoofed extensions/magic bytes & oversized logos
/// </summary>
public class BatchesAndLogoGovernanceTests
{
    private sealed class MutableTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches { get; set; }
    }

    private sealed class FakeEnv(string contentRoot, string? webRoot = null) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "PharmacyApi";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = contentRoot;
        public string EnvironmentName { get; set; } = "Production";
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = webRoot!;
    }

    private static ApplicationDbContext CreateDb(ITenantContextService ctx, string dbName)
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new ApplicationDbContext(opts, ctx);
    }

    [Fact]
    public void BatchesController_HasStrictRoleAndModulePermissionGuards()
    {
        var type = typeof(BatchesController);
        Assert.NotNull(type.GetCustomAttribute<AuthorizeAttribute>());

        var getAll = type.GetMethod(nameof(BatchesController.GetAll))!;
        var getPerm = getAll.GetCustomAttribute<ModulePermissionAttribute>();
        Assert.NotNull(getPerm);
        Assert.Equal("Batches", getPerm!.Arguments![0]);
        Assert.Equal("view", getPerm.Arguments![1]);

        var update = type.GetMethod(nameof(BatchesController.UpdateStatus))!;
        var auth = update.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(auth);
        Assert.Equal("SystemAdmin,Admin", auth!.Roles);
        var editPerm = update.GetCustomAttribute<ModulePermissionAttribute>();
        Assert.NotNull(editPerm);
        Assert.Equal("Batches", editPerm!.Arguments![0]);
        Assert.Equal("edit", editPerm.Arguments![1]);
    }

    [Fact]
    public async Task BatchesController_RecallQuarantine_EnforcesTenantAdminScopeAndValidation()
    {
        var dbName = Guid.NewGuid().ToString();
        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using (var seed = CreateDb(seedCtx, dbName))
        {
            seed.Tenants.AddRange(
                new Tenant { TenantId = 1, PharmacyName = "T1", IsActive = true },
                new Tenant { TenantId = 2, PharmacyName = "T2", IsActive = true });
            seed.Branches.AddRange(
                new Branch { BranchId = 1, TenantId = 1, BranchName = "T1 B1", IsHeadOffice = true, IsActive = true },
                new Branch { BranchId = 2, TenantId = 2, BranchName = "T2 B2", IsHeadOffice = true, IsActive = true });
            seed.Medicines.AddRange(
                new Medicine { MedicineId = 1, TenantId = 1, Code = "M1", Name = "Napa", SalePrice = 5 },
                new Medicine { MedicineId = 2, TenantId = 2, Code = "M2", Name = "Ace", SalePrice = 5 });
            seed.MedicineBatches.AddRange(
                new MedicineBatch { BatchId = 10, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "T1-B10", CurrentStock = 25, Status = "Active", ExpiryDate = DateTime.UtcNow.AddYears(1) },
                new MedicineBatch { BatchId = 20, TenantId = 2, BranchId = 2, MedicineId = 2, BatchNumber = "T2-B20", CurrentStock = 40, Status = "Active", ExpiryDate = DateTime.UtcNow.AddYears(1) });
            await seed.SaveChangesAsync();
        }

        // Branch-locked Manager cannot mutate batch status (403)
        var mgrCtx = new MutableTenantContext { TenantId = 1, BranchId = 1, CanAccessAllBranches = false };
        await using (var dbMgr = CreateDb(mgrCtx, dbName))
        {
            var ctrlMgr = new BatchesController(dbMgr, mgrCtx);
            var forbid = Assert.IsType<ObjectResult>(await ctrlMgr.UpdateStatus(10, new UpdateBatchStatusDto { Status = "Recalled" }));
            Assert.Equal(StatusCodes.Status403Forbidden, forbid.StatusCode);
        }

        // T1 Admin can recall own batch, gets 404 on T2 batch, gets 400 on invalid status
        var admCtx = new MutableTenantContext { TenantId = 1, BranchId = null, CanAccessAllBranches = true };
        await using var dbAdm = CreateDb(admCtx, dbName);
        var ctrlAdm = new BatchesController(dbAdm, admCtx);

        var listOk = Assert.IsType<OkObjectResult>(await ctrlAdm.GetAll());
        var listJson = System.Text.Json.JsonSerializer.Serialize(listOk.Value);
        Assert.Contains("T1-B10", listJson);
        Assert.DoesNotContain("T2-B20", listJson);

        Assert.IsType<BadRequestObjectResult>(await ctrlAdm.UpdateStatus(10, new UpdateBatchStatusDto { Status = "Invalid" }));
        Assert.IsType<NotFoundResult>(await ctrlAdm.UpdateStatus(20, new UpdateBatchStatusDto { Status = "Recalled" }));
        Assert.IsType<OkObjectResult>(await ctrlAdm.UpdateStatus(10, new UpdateBatchStatusDto { Status = "recalled" }));

        var updated = await dbAdm.MedicineBatches.SingleAsync(b => b.BatchId == 10);
        Assert.Equal("Recalled", updated.Status);
    }

    [Fact]
    public async Task UploadLogo_BlocksSpoofedMagicBytes_AllowsValidPng()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), "s7pms_logo_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempRoot);
        try
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDataProtection();
            var ctx = new MutableTenantContext { IsSystemAdmin = true };
            services.AddScoped<ITenantContextService>(_ => ctx);
            services.AddDbContext<ApplicationDbContext>(opts =>
                opts.UseInMemoryDatabase(Guid.NewGuid().ToString())
                    .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
            services.AddIdentityCore<ApplicationUser>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<ApplicationDbContext>();
            services.AddScoped<IUserManagementService, UserManagementService>();
            using var provider = services.BuildServiceProvider();

            var db = provider.GetRequiredService<ApplicationDbContext>();
            db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "Logo Pharmacy", IsActive = true });
            await db.SaveChangesAsync();

            var ctrl = new TenantsController(
                db,
                ctx,
                provider.GetRequiredService<UserManager<ApplicationUser>>(),
                provider.GetRequiredService<IUserManagementService>());

            var env = new FakeEnv(tempRoot, Path.Combine(tempRoot, "wwwroot"));

            // Spoofed PNG (HTML/script payload renamed .png)
            var badBytes = Encoding.UTF8.GetBytes("<script>alert(1)</script>");
            using var badStream = new MemoryStream(badBytes);
            var badFile = new FormFile(badStream, 0, badBytes.Length, "file", "evil.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png"
            };
            Assert.IsType<BadRequestObjectResult>(await ctrl.UploadLogo(1, badFile, env));

            // Real minimal PNG header
            var pngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };
            using var okStream = new MemoryStream(pngBytes);
            var okFile = new FormFile(okStream, 0, pngBytes.Length, "file", "brand.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png"
            };
            var ok = Assert.IsType<OkObjectResult>(await ctrl.UploadLogo(1, okFile, env));
            Assert.Contains("/uploads/logos/tenant-1/logo.png", System.Text.Json.JsonSerializer.Serialize(ok.Value));
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task TenantsController_GetById_SerializesBranchesWithoutCycle()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection();
        var ctx = new MutableTenantContext { IsSystemAdmin = true };
        services.AddScoped<ITenantContextService>(_ => ctx);
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        using var provider = services.BuildServiceProvider();

        var db = provider.GetRequiredService<ApplicationDbContext>();
        db.Tenants.Add(new Tenant { TenantId = 7, PharmacyName = "CycleSafe Pharmacy", IsActive = true });
        db.Branches.AddRange(
            new Branch { BranchId = 71, TenantId = 7, BranchName = "Branch B", IsHeadOffice = false, IsActive = true },
            new Branch { BranchId = 70, TenantId = 7, BranchName = "HQ", IsHeadOffice = true, IsActive = true });
        await db.SaveChangesAsync();

        var ctrl = new TenantsController(
            db,
            ctx,
            provider.GetRequiredService<UserManager<ApplicationUser>>(),
            provider.GetRequiredService<IUserManagementService>());

        var result = Assert.IsType<OkObjectResult>(await ctrl.GetById(7));
        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        Assert.Contains("CycleSafe Pharmacy", json);
        Assert.Contains("HQ", json);
        Assert.Contains("Branch B", json);
    }
}
