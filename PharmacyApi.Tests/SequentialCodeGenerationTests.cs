using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-04 invariants:
/// - InvoiceCode and GrnCode sequences must see across branches within the same Tenant (IgnoreQueryFilters)
/// - Tenant sequences must remain completely isolated between separate Tenants
/// - Double-digit sequences and deduped/legacy suffixes must compute true numeric max + 1
/// - SalesRepository and PurchaseRepository must acquire sequence AppLock inside ExecuteInTransactionAsync
/// </summary>
public class SequentialCodeGenerationTests
{
    private sealed class MutableTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;
    }

    private static DateTime BdToday() =>
        TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time")).Date;

    private static ApplicationDbContext CreateInMemoryDb(MutableTenantContext ctx, string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options, ctx);
    }

    private static string FindRepositoryRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "PharmacyApi.csproj")))
            dir = dir.Parent;

        Assert.NotNull(dir);
        return dir!.FullName;
    }

    [Fact]
    public async Task SalesRepository_CrossBranch_GeneratesSequentialUniqueInvoiceCodes()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "S7 Test Pharma" });
        db.Branches.AddRange(
            new Branch { BranchId = 1, TenantId = 1, BranchName = "Head Office", IsHeadOffice = true },
            new Branch { BranchId = 2, TenantId = 1, BranchName = "Dhanmondi", IsHeadOffice = false });
        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa", StockQuantity = 50, SalePrice = 5 });
        db.MedicineBatches.AddRange(
            new MedicineBatch { BatchId = 1, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "B1", CurrentStock = 25, Status = "Active", ExpiryDate = DateTime.UtcNow.AddYears(1) },
            new MedicineBatch { BatchId = 2, TenantId = 1, BranchId = 2, MedicineId = 1, BatchNumber = "B1", CurrentStock = 25, Status = "Active", ExpiryDate = DateTime.UtcNow.AddYears(1) });
        await db.SaveChangesAsync();

        var repo = new SalesRepository(db, ctx);
        string prefix = $"INV{BdToday():yyyyMMdd}-";

        // Branch 1 creates first invoice -> -1
        Assert.Equal($"{prefix}1", await repo.GetNextInvoiceCodeAsync());
        var sale1 = await repo.CreateAsync(new SalesMasterDto
        {
            SaleDate = BdToday(),
            SubTotal = 10,
            GrandTotal = 10,
            PaidAmount = 10,
            SalesDetails = { new SalesDetailDto { MedicineId = 1, BatchNumber = "B1", Quantity = 2, UnitPrice = 5, LineTotal = 10 } }
        }, "cashier_b1");
        Assert.Equal($"{prefix}1", sale1.InvoiceCode);
        Assert.Equal(1, sale1.BranchId);

        // Switch to Branch 2 -> MUST see Branch 1's -1 and issue -2
        ctx.BranchId = 2;
        Assert.Equal($"{prefix}2", await repo.GetNextInvoiceCodeAsync());
        var sale2 = await repo.CreateAsync(new SalesMasterDto
        {
            SaleDate = BdToday(),
            SubTotal = 15,
            GrandTotal = 15,
            PaidAmount = 15,
            SalesDetails = { new SalesDetailDto { MedicineId = 1, BatchNumber = "B1", Quantity = 3, UnitPrice = 5, LineTotal = 15 } }
        }, "cashier_b2");
        Assert.Equal($"{prefix}2", sale2.InvoiceCode);
        Assert.Equal(2, sale2.BranchId);

        // Switch back to Branch 1 -> next is -3
        ctx.BranchId = 1;
        Assert.Equal($"{prefix}3", await repo.GetNextInvoiceCodeAsync());
    }

    [Fact]
    public async Task PurchaseRepository_CrossBranch_GeneratesSequentialUniqueGrnCodes()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "S7 Test Pharma" });
        db.Branches.AddRange(
            new Branch { BranchId = 1, TenantId = 1, BranchName = "Head Office", IsHeadOffice = true },
            new Branch { BranchId = 2, TenantId = 1, BranchName = "Mirpur", IsHeadOffice = false });
        db.Parties.Add(new Party { PartyId = 1, TenantId = 1, Code = "SUP-1", PartyType = "Supplier", FullName = "Beximco", Cell = "01700000001" });
        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa" });
        await db.SaveChangesAsync();

        var repo = new PurchaseRepository(db, ctx);

        // Branch 1 creates GRN-00001
        Assert.Equal("GRN-00001", await repo.GetNextGrnCodeAsync());
        var p1 = await repo.CreateAsync(new PurchaseMasterDto
        {
            SupplierId = 1,
            PurchaseDate = BdToday(),
            SubTotal = 100,
            GrandTotal = 100,
            PaidAmount = 100,
            PurchaseDetails = { new PurchaseDetailDto { MedicineId = 1, BatchNumber = "LOT-1", Quantity = 10, UnitCost = 10, SalePrice = 12, LineTotal = 100 } }
        }, "mgr_b1");
        Assert.Equal("GRN-00001", p1.GrnCode);
        Assert.Equal(1, p1.BranchId);

        // Branch 2 MUST see Branch 1's GRN-00001 and issue GRN-00002
        ctx.BranchId = 2;
        Assert.Equal("GRN-00002", await repo.GetNextGrnCodeAsync());
        var p2 = await repo.CreateAsync(new PurchaseMasterDto
        {
            SupplierId = 1,
            PurchaseDate = BdToday(),
            SubTotal = 200,
            GrandTotal = 200,
            PaidAmount = 200,
            PurchaseDetails = { new PurchaseDetailDto { MedicineId = 1, BatchNumber = "LOT-2", Quantity = 20, UnitCost = 10, SalePrice = 12, LineTotal = 200 } }
        }, "mgr_b2");
        Assert.Equal("GRN-00002", p2.GrnCode);
        Assert.Equal(2, p2.BranchId);
    }

    [Fact]
    public async Task CodeGeneration_RemainsIsolatedAcrossTenants()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        var today = BdToday();
        string invPrefix = $"INV{today:yyyyMMdd}-";

        db.SalesMasters.Add(new SalesMaster { SaleId = 1, TenantId = 1, BranchId = 1, InvoiceCode = $"{invPrefix}7", SaleDate = today, SaleTime = today });
        db.PurchaseMasters.Add(new PurchaseMaster { PurchaseId = 1, TenantId = 1, BranchId = 1, PartyId = 1, GrnCode = "GRN-00009", PurchaseDate = today });
        await db.SaveChangesAsync();

        // Tenant 2 starts clean at 1 / GRN-00001
        ctx.TenantId = 2;
        ctx.BranchId = 5;

        var salesRepo = new SalesRepository(db, ctx);
        var purchaseRepo = new PurchaseRepository(db, ctx);

        Assert.Equal($"{invPrefix}1", await salesRepo.GetNextInvoiceCodeAsync());
        Assert.Equal("GRN-00001", await purchaseRepo.GetNextGrnCodeAsync());
    }

    [Fact]
    public async Task CodeGeneration_ComputesNumericMaxPastNine_AndSkipsMixedSuffixes()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 2 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        var today = BdToday();
        string invPrefix = $"INV{today:yyyyMMdd}-";

        // Seed on Branch 1 while querying from Branch 2
        db.SalesMasters.AddRange(
            new SalesMaster { SaleId = 1, TenantId = 1, BranchId = 1, InvoiceCode = $"{invPrefix}9", SaleDate = today, SaleTime = today },
            new SalesMaster { SaleId = 2, TenantId = 1, BranchId = 1, InvoiceCode = $"{invPrefix}10", SaleDate = today, SaleTime = today },
            new SalesMaster { SaleId = 3, TenantId = 1, BranchId = 1, InvoiceCode = $"{invPrefix}2-LEGACY", SaleDate = today, SaleTime = today });

        db.PurchaseMasters.AddRange(
            new PurchaseMaster { PurchaseId = 1, TenantId = 1, BranchId = 1, PartyId = 1, GrnCode = "GRN-00009", PurchaseDate = today },
            new PurchaseMaster { PurchaseId = 2, TenantId = 1, BranchId = 1, PartyId = 1, GrnCode = "GRN-00010", PurchaseDate = today },
            new PurchaseMaster { PurchaseId = 3, TenantId = 1, BranchId = 1, PartyId = 1, GrnCode = "GRN-00001-3", PurchaseDate = today });
        await db.SaveChangesAsync();

        var salesRepo = new SalesRepository(db, ctx);
        var purchaseRepo = new PurchaseRepository(db, ctx);

        Assert.Equal($"{invPrefix}11", await salesRepo.GetNextInvoiceCodeAsync());
        Assert.Equal("GRN-00011", await purchaseRepo.GetNextGrnCodeAsync());
    }

    [Fact]
    public void SalesAndPurchaseRepositories_EnforceAppLock_IgnoreQueryFilters_AndExecuteInTransaction()
    {
        var root = FindRepositoryRoot();
        var salesRepoSrc = File.ReadAllText(Path.Combine(root, "Repositories", "SalesRepository.cs"));
        var purchaseRepoSrc = File.ReadAllText(Path.Combine(root, "Repositories", "PurchaseRepository.cs"));

        Assert.Contains(".IgnoreQueryFilters()", salesRepoSrc, StringComparison.Ordinal);
        Assert.Contains("AcquireTransactionAppLockAsync($\"SEQ_INV_T{tenantId}\"", salesRepoSrc, StringComparison.Ordinal);
        Assert.Contains("_context.ExecuteInTransactionAsync", salesRepoSrc, StringComparison.Ordinal);

        Assert.Contains(".IgnoreQueryFilters()", purchaseRepoSrc, StringComparison.Ordinal);
        Assert.Contains("AcquireTransactionAppLockAsync($\"SEQ_GRN_T{tenantId}\"", purchaseRepoSrc, StringComparison.Ordinal);
        Assert.Contains("_context.ExecuteInTransactionAsync", purchaseRepoSrc, StringComparison.Ordinal);
    }
}
