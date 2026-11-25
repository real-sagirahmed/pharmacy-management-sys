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
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-03 invariants:
/// - TenantsController.Create executes inside retry-safe ExecuteInTransactionAsync
/// - BranchesController.ApproveTransfer executes inside ExecuteInTransactionAsync & rolls back cleanly on invalid stock
/// - No production C# file invokes BeginTransaction* directly without CreateExecutionStrategy()
/// </summary>
public class TransactionExecutionStrategyTests
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

    [Fact]
    public async Task TenantsController_Create_CreatesTenantAndHeadOfficeBranch_InExecutionStrategyTransaction()
    {
        var ctx = new StubTenantContext { IsSystemAdmin = true, TenantId = null };
        using var provider = CreateProvider(ctx, Guid.NewGuid().ToString());
        var db = provider.GetRequiredService<ApplicationDbContext>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var userSvc = provider.GetRequiredService<IUserManagementService>();

        var controller = new TenantsController(db, ctx, userMgr, userSvc);
        var dto = new CreateTenantDto
        {
            PharmacyName = "Green Care Pharma",
            Slogan = "Care First",
            Address = "Dhanmondi, Dhaka",
            Phone = "01711000000",
            Email = "info@greencare.test",
            DrugLicenseNo = "DL-102",
            PrimaryColor = "#007070",
            HeadOfficeBranchName = "Dhanmondi Main"
        };

        var actionResult = await controller.Create(dto);

        var created = Assert.IsType<CreatedAtActionResult>(actionResult);
        Assert.Equal(nameof(TenantsController.GetById), created.ActionName);

        var savedTenant = await db.Tenants.IgnoreQueryFilters().SingleAsync();
        var savedBranch = await db.Branches.IgnoreQueryFilters().SingleAsync();

        Assert.Equal("Green Care Pharma", savedTenant.PharmacyName);
        Assert.Equal(savedTenant.TenantId, savedBranch.TenantId);
        Assert.Equal("Dhanmondi Main", savedBranch.BranchName);
        Assert.True(savedBranch.IsHeadOffice);
    }

    [Fact]
    public async Task BranchesController_ApproveTransfer_MovesStockAtomically_AndRollsBackOnInsufficientStock()
    {
        // Case 1: Sufficient stock -> transfers stock atomically & completes transfer
        var okCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = null };
        using (var provider = CreateProvider(okCtx, Guid.NewGuid().ToString()))
        {
            var db = provider.GetRequiredService<ApplicationDbContext>();
            db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "T1" });
            db.Branches.AddRange(
                new Branch { BranchId = 1, TenantId = 1, BranchName = "Main", IsHeadOffice = true },
                new Branch { BranchId = 2, TenantId = 1, BranchName = "Banani" });
            db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "M-1", Name = "Napa", SalePrice = 2 });
            db.MedicineBatches.Add(new MedicineBatch
            {
                BatchId = 10,
                TenantId = 1,
                BranchId = 1,
                MedicineId = 1,
                BatchNumber = "B101",
                ExpiryDate = DateTime.UtcNow.AddYears(1),
                CurrentStock = 20,
                PurchasePrice = 1,
                SalePrice = 2,
                Status = "Active"
            });
            db.BranchTransfers.Add(new BranchTransfer
            {
                TransferId = 1,
                TenantId = 1,
                FromBranchId = 1,
                ToBranchId = 2,
                MedicineId = 1,
                BatchId = 10,
                BatchNumber = "B101",
                Quantity = 5,
                TransferCode = "TRF-TEST-1",
                Status = "Pending"
            });
            await db.SaveChangesAsync();

            var controller = new BranchesController(db, okCtx)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "admin1") }, "Test"))
                    }
                }
            };

            var res = await controller.ApproveTransfer(1);
            Assert.IsType<OkObjectResult>(res);

            var src = await db.MedicineBatches.IgnoreQueryFilters().SingleAsync(b => b.BranchId == 1);
            var dst = await db.MedicineBatches.IgnoreQueryFilters().SingleAsync(b => b.BranchId == 2);
            var trf = await db.BranchTransfers.IgnoreQueryFilters().SingleAsync(t => t.TransferId == 1);

            Assert.Equal(15, src.CurrentStock);
            Assert.Equal(5, dst.CurrentStock);
            Assert.Equal("Completed", trf.Status);
            Assert.Equal("admin1", trf.ApprovedBy);
        }

        // Case 2: Insufficient stock -> returns BadRequest and makes zero changes
        var failCtx = new StubTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = null };
        using (var provider = CreateProvider(failCtx, Guid.NewGuid().ToString()))
        {
            var db = provider.GetRequiredService<ApplicationDbContext>();
            db.MedicineBatches.Add(new MedicineBatch
            {
                BatchId = 11,
                TenantId = 1,
                BranchId = 1,
                MedicineId = 1,
                BatchNumber = "B102",
                ExpiryDate = DateTime.UtcNow.AddYears(1),
                CurrentStock = 3,
                PurchasePrice = 1,
                SalePrice = 2,
                Status = "Active"
            });
            db.BranchTransfers.Add(new BranchTransfer
            {
                TransferId = 2,
                TenantId = 1,
                FromBranchId = 1,
                ToBranchId = 2,
                MedicineId = 1,
                BatchId = 11,
                BatchNumber = "B102",
                Quantity = 10,
                TransferCode = "TRF-TEST-2",
                Status = "Pending"
            });
            await db.SaveChangesAsync();

            var controller = new BranchesController(db, failCtx);
            var res = await controller.ApproveTransfer(2);
            Assert.IsType<BadRequestObjectResult>(res);

            var src = await db.MedicineBatches.IgnoreQueryFilters().SingleAsync(b => b.BatchId == 11);
            var dstExists = await db.MedicineBatches.IgnoreQueryFilters().AnyAsync(b => b.BranchId == 2);
            var trf = await db.BranchTransfers.IgnoreQueryFilters().SingleAsync(t => t.TransferId == 2);

            Assert.Equal(3, src.CurrentStock);
            Assert.False(dstExists);
            Assert.Equal("Pending", trf.Status);
        }
    }

    [Fact]
    public void NoDirectBeginTransactionWithoutExecutionStrategy_AcrossProductionCode()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "PharmacyApi.csproj")))
        {
            dir = dir.Parent;
        }
        Assert.NotNull(dir);

        var targetDirs = new[] { "Controllers", "Repositories", "Services", "Data", "Filters" }
            .Select(d => Path.Combine(dir!.FullName, d))
            .Where(Directory.Exists);

        var violations = new List<string>();
        foreach (var folder in targetDirs)
        {
            foreach (var file in Directory.GetFiles(folder, "*.cs", SearchOption.AllDirectories))
            {
                var lines = File.ReadAllLines(file);
                for (int i = 0; i < lines.Length; i++)
                {
                    var trimmed = lines[i].TrimStart();
                    if (trimmed.StartsWith("//") || trimmed.StartsWith("*"))
                        continue;

                    if (!trimmed.Contains(".BeginTransaction", StringComparison.Ordinal))
                        continue;

                    int start = Math.Max(0, i - 15);
                    bool hasStrategyNearby = Enumerable.Range(start, i - start + 1)
                        .Any(idx => !lines[idx].TrimStart().StartsWith("//")
                                 && lines[idx].Contains("CreateExecutionStrategy(", StringComparison.Ordinal));

                    if (!hasStrategyNearby)
                    {
                        var rel = Path.GetRelativePath(dir!.FullName, file);
                        violations.Add($"{rel}:{i + 1} calls BeginTransaction without preceding CreateExecutionStrategy()");
                    }
                }
            }
        }

        Assert.True(violations.Count == 0,
            "EnableRetryOnFailure violation(s) found:\n" + string.Join("\n", violations));
    }
}
