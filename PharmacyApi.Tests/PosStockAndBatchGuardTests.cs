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
/// Regression tests locking GAP-05 invariants:
/// - Zero-stock branches cannot sell another branch's stock via Auto-FIFO (`&& med.StockQuantity` removed)
/// - Explicitly supplied BatchNumber missing from the current branch cannot bypass MedicineBatches guards
/// - Recalled, Quarantined, non-Active, and Expired batches are strictly rejected
/// - GetBatchesForMedicineAsync never falls back to tenant-wide Medicine.StockQuantity as a phantom batch
/// </summary>
public class PosStockAndBatchGuardTests
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
    public async Task AutoFifoSale_InZeroStockBranch_RejectsEvenWhenOtherBranchHasCatalogStock()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 2 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        var today = BdToday();
        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "S7 Test Pharma" });
        db.Branches.AddRange(
            new Branch { BranchId = 1, TenantId = 1, BranchName = "Main Branch", IsHeadOffice = true },
            new Branch { BranchId = 2, TenantId = 1, BranchName = "Empty Branch", IsHeadOffice = false });
        db.Medicines.Add(new Medicine
        {
            MedicineId = 1,
            TenantId = 1,
            Code = "MED-1",
            Name = "Napa 500",
            StockQuantity = 100, // Reflects Branch 1 stock in shared catalog
            SalePrice = 5
        });
        db.MedicineBatches.Add(new MedicineBatch
        {
            BatchId = 1,
            TenantId = 1,
            BranchId = 1,
            MedicineId = 1,
            BatchNumber = "B1-LOT",
            CurrentStock = 100,
            Status = "Active",
            ExpiryDate = today.AddYears(1)
        });
        await db.SaveChangesAsync();

        var repo = new SalesRepository(db, ctx);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(new SalesMasterDto
        {
            SaleDate = today,
            SubTotal = 25,
            GrandTotal = 25,
            PaidAmount = 25,
            SalesDetails =
            {
                new SalesDetailDto { MedicineId = 1, BatchNumber = string.Empty, Quantity = 5, UnitPrice = 5, LineTotal = 25 }
            }
        }, "cashier_b2"));

        Assert.Contains("0", ex.Message, StringComparison.Ordinal);

        // Ensure Branch 1 stock and catalog stock remained untouched
        var med = await db.Medicines.IgnoreQueryFilters().SingleAsync(m => m.MedicineId == 1);
        var b1Batch = await db.MedicineBatches.IgnoreQueryFilters().SingleAsync(b => b.BatchId == 1);
        Assert.Equal(100, med.StockQuantity);
        Assert.Equal(100, b1Batch.CurrentStock);
        Assert.Empty(await db.SalesMasters.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task ExplicitBatchSale_MissingInCurrentBranch_RejectsBypassEvenIfPresentInOtherBranch()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 2 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        var today = BdToday();
        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "S7 Test Pharma" });
        db.Branches.AddRange(
            new Branch { BranchId = 1, TenantId = 1, BranchName = "Main Branch", IsHeadOffice = true },
            new Branch { BranchId = 2, TenantId = 1, BranchName = "Empty Branch", IsHeadOffice = false });
        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa 500", StockQuantity = 50, SalePrice = 5 });
        db.MedicineBatches.Add(new MedicineBatch
        {
            BatchId = 1,
            TenantId = 1,
            BranchId = 1,
            MedicineId = 1,
            BatchNumber = "B1-ONLY",
            CurrentStock = 50,
            Status = "Recalled",
            ExpiryDate = today.AddYears(1)
        });
        await db.SaveChangesAsync();

        var repo = new SalesRepository(db, ctx);

        // Attempt 1: Pass Branch 1's batch name from Branch 2
        await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(new SalesMasterDto
        {
            SaleDate = today,
            SubTotal = 10,
            GrandTotal = 10,
            PaidAmount = 10,
            SalesDetails = { new SalesDetailDto { MedicineId = 1, BatchNumber = "B1-ONLY", Quantity = 2, UnitPrice = 5, LineTotal = 10 } }
        }, "cashier_b2"));

        // Attempt 2: Pass fabricated batch name from Branch 2
        await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(new SalesMasterDto
        {
            SaleDate = today,
            SubTotal = 10,
            GrandTotal = 10,
            PaidAmount = 10,
            SalesDetails = { new SalesDetailDto { MedicineId = 1, BatchNumber = "FAKE-999", Quantity = 2, UnitPrice = 5, LineTotal = 10 } }
        }, "cashier_b2"));

        var med = await db.Medicines.IgnoreQueryFilters().SingleAsync(m => m.MedicineId == 1);
        Assert.Equal(50, med.StockQuantity);
    }

    [Theory]
    [InlineData("Recalled", 365)]
    [InlineData("Quarantined", 365)]
    [InlineData("Inactive", 365)]
    [InlineData("Active", -1)]
    public async Task ExplicitBatchSale_BlocksRecalledQuarantinedNonActiveAndExpiredBatches(string status, int expiryDaysOffset)
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        var today = BdToday();
        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "S7 Test Pharma" });
        db.Branches.Add(new Branch { BranchId = 1, TenantId = 1, BranchName = "Main Branch", IsHeadOffice = true });
        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa 500", StockQuantity = 20, SalePrice = 5 });
        db.MedicineBatches.Add(new MedicineBatch
        {
            BatchId = 1,
            TenantId = 1,
            BranchId = 1,
            MedicineId = 1,
            BatchNumber = "TEST-LOT",
            CurrentStock = 20,
            Status = status,
            ExpiryDate = today.AddDays(expiryDaysOffset)
        });
        await db.SaveChangesAsync();

        var repo = new SalesRepository(db, ctx);

        await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(new SalesMasterDto
        {
            SaleDate = today,
            SubTotal = 5,
            GrandTotal = 5,
            PaidAmount = 5,
            SalesDetails = { new SalesDetailDto { MedicineId = 1, BatchNumber = "TEST-LOT", Quantity = 1, UnitPrice = 5, LineTotal = 5 } }
        }, "cashier_b1"));
    }

    [Fact]
    public async Task AutoFifoSale_IgnoresExpiredAndRecalledBatches_AndSellsValidActiveFefoOnly()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        var today = BdToday();
        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "S7 Test Pharma" });
        db.Branches.Add(new Branch { BranchId = 1, TenantId = 1, BranchName = "Main Branch", IsHeadOffice = true });
        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa 500", StockQuantity = 23, SalePrice = 5 });
        db.MedicineBatches.AddRange(
            new MedicineBatch { BatchId = 1, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "EXP-10", CurrentStock = 10, Status = "Active", ExpiryDate = today.AddDays(-2) },
            new MedicineBatch { BatchId = 2, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "REC-10", CurrentStock = 10, Status = "Recalled", ExpiryDate = today.AddDays(90) },
            new MedicineBatch { BatchId = 3, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "ACT-03", CurrentStock = 3, Status = "Active", ExpiryDate = today.AddDays(30) });
        await db.SaveChangesAsync();

        var repo = new SalesRepository(db, ctx);

        // Requesting 5 when only 3 active/unexpired units exist must reject (23 in catalog must NOT fool FIFO)
        await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(new SalesMasterDto
        {
            SaleDate = today,
            SubTotal = 25,
            GrandTotal = 25,
            PaidAmount = 25,
            SalesDetails = { new SalesDetailDto { MedicineId = 1, BatchNumber = string.Empty, Quantity = 5, UnitPrice = 5, LineTotal = 25 } }
        }, "cashier_b1"));

        // Requesting 3 must succeed and pick ACT-03 only
        var created = await repo.CreateAsync(new SalesMasterDto
        {
            SaleDate = today,
            SubTotal = 15,
            GrandTotal = 15,
            PaidAmount = 15,
            SalesDetails = { new SalesDetailDto { MedicineId = 1, BatchNumber = string.Empty, Quantity = 3, UnitPrice = 5, LineTotal = 15 } }
        }, "cashier_b1");

        var activeBatch = await db.MedicineBatches.SingleAsync(b => b.BatchId == 3);
        var med = await db.Medicines.SingleAsync(m => m.MedicineId == 1);
        Assert.Equal("ACT-03", created.SalesDetails[0].BatchNumber);
        Assert.Equal(0, activeBatch.CurrentStock);
        Assert.Equal(20, med.StockQuantity);
    }

    [Fact]
    public async Task GetBatchesForMedicineAsync_DoesNotLeakOtherBranchCatalogStockAsDefaultBatch()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 2 };
        await using var db = CreateInMemoryDb(ctx, dbName);

        var today = BdToday();
        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "S7 Test Pharma" });
        db.Branches.AddRange(
            new Branch { BranchId = 1, TenantId = 1, BranchName = "Main Branch", IsHeadOffice = true },
            new Branch { BranchId = 2, TenantId = 1, BranchName = "Empty Branch", IsHeadOffice = false });
        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa 500", Batch = "LEGACY-B", StockQuantity = 40, SalePrice = 5 });
        db.MedicineBatches.Add(new MedicineBatch
        {
            BatchId = 1,
            TenantId = 1,
            BranchId = 1,
            MedicineId = 1,
            BatchNumber = "B1-BATCH",
            CurrentStock = 40,
            Status = "Active",
            ExpiryDate = today.AddDays(60)
        });
        await db.SaveChangesAsync();

        var repo = new SalesRepository(db, ctx);

        // Branch 2 has no batches -> must return Empty (never "DEFAULT" / "LEGACY-B" from Branch 1)
        var branch2Batches = (await repo.GetBatchesForMedicineAsync(1)).ToList();
        Assert.Empty(branch2Batches);

        // Branch 1 sees its own batch
        ctx.BranchId = 1;
        var branch1Batches = (await repo.GetBatchesForMedicineAsync(1)).ToList();
        Assert.Single(branch1Batches);
        Assert.Equal("B1-BATCH", branch1Batches[0].BatchNumber);
        Assert.Equal(40, branch1Batches[0].AvailableQty);
    }

    [Fact]
    public void SalesRepository_LocksStrictBranchBatchValidation_WithoutCatalogStockBypass()
    {
        var root = FindRepositoryRoot();
        var src = File.ReadAllText(Path.Combine(root, "Repositories", "SalesRepository.cs"));

        Assert.DoesNotContain("totalBatchStock < item.Quantity && med.StockQuantity < item.Quantity", src, StringComparison.Ordinal);
        Assert.DoesNotContain("Fallback for legacy medicines without MedicineBatch entry", src, StringComparison.Ordinal);
        Assert.Contains("if (targetBatch == null)", src, StringComparison.Ordinal);
        Assert.Contains("if (totalBatchStock < item.Quantity)", src, StringComparison.Ordinal);
    }
}
