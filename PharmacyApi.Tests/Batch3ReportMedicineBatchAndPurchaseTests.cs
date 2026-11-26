using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PharmacyApi.Controllers;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking Batch 3 (GAP-13, GAP-14, GAP-16) invariants:
/// - GAP-13: ReportRepository & MedicineRepository source stock/expiry/low-stock/batches from branch-filtered MedicineBatches + BdNow()
/// - GAP-14: GetBatchesForMedicineAsync excludes Expired, Recalled, and Quarantined batches
/// - GAP-16: PurchaseRepository links PurchaseDetailId and rejects Recalled/Quarantined restock; SuppliersController uses Parties cleanly; VisualDashboard aligns to ReportDtos
/// </summary>
public class Batch3ReportMedicineBatchAndPurchaseTests
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

    private static ApplicationDbContext CreateDb(ITenantContextService ctx, string dbName)
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
    public async Task ReportRepository_StockLowStockAndExpiry_UseBranchFilteredMedicineBatches()
    {
        var dbName = Guid.NewGuid().ToString();
        var today = BdToday();

        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using (var seed = CreateDb(seedCtx, dbName))
        {
            seed.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "T1", IsActive = true });
            seed.Branches.AddRange(
                new Branch { BranchId = 1, TenantId = 1, BranchName = "B1", IsHeadOffice = true, IsActive = true },
                new Branch { BranchId = 2, TenantId = 1, BranchName = "B2", IsHeadOffice = false, IsActive = true });
            seed.Medicines.Add(new Medicine
            {
                MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa",
                Category = "Analgesic", StockQuantity = 500, PurchasePrice = 2m, SalePrice = 5m, IsActive = true
            });
            seed.MedicineBatches.AddRange(
                new MedicineBatch { BatchId = 1, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "B1-EXP", ExpiryDate = today.AddDays(-2), CurrentStock = 5, Status = "Active" },
                new MedicineBatch { BatchId = 2, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "B1-REC", ExpiryDate = today.AddDays(30), CurrentStock = 50, Status = "Recalled" },
                new MedicineBatch { BatchId = 3, TenantId = 1, BranchId = 2, MedicineId = 1, BatchNumber = "B2-ACT", ExpiryDate = today.AddDays(20), CurrentStock = 100, Status = "Active" });
            await seed.SaveChangesAsync();
        }

        // Branch 1 sees only active B1 stock = 5 (LowStock <= 10, Expired status), excludes B1-REC & B2-ACT
        var b1Ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using (var db1 = CreateDb(b1Ctx, dbName))
        {
            var rpt1 = new ReportRepository(db1);
            var stock1 = (await rpt1.GetStockStatusAsync()).Single();
            Assert.Equal(5, stock1.CurrentStock);

            var low1 = (await rpt1.GetLowStockReportAsync()).ToList();
            Assert.Single(low1);
            Assert.Equal(5, low1[0].CurrentStock);

            var exp1 = (await rpt1.GetExpiryReportAsync(3)).ToList();
            Assert.Single(exp1);
            Assert.Equal("B1-EXP", exp1[0].BatchNumber);
            Assert.Equal("Expired", exp1[0].Status);
        }

        // Branch 2 sees active B2 stock = 100 (NOT low stock; Expiring Soon)
        var b2Ctx = new MutableTenantContext { TenantId = 1, BranchId = 2 };
        await using var db2 = CreateDb(b2Ctx, dbName);
        var rpt2 = new ReportRepository(db2);
        Assert.Equal(100, (await rpt2.GetStockStatusAsync()).Single().CurrentStock);
        Assert.Empty(await rpt2.GetLowStockReportAsync());
        var exp2 = (await rpt2.GetExpiryReportAsync(3)).Single();
        Assert.Equal("B2-ACT", exp2.BatchNumber);
        Assert.Equal("Expiring Soon", exp2.Status);
    }

    [Fact]
    public async Task MedicineRepository_GetByIdAndBatchExists_SourceStrictlyFromBranchBatches()
    {
        var dbName = Guid.NewGuid().ToString();
        var today = BdToday();

        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using (var seed = CreateDb(seedCtx, dbName))
        {
            seed.Medicines.Add(new Medicine
            {
                MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Sergel",
                Batch = "LEGACY-CATALOG", StockQuantity = 999, SalePrice = 7m, IsActive = true
            });
            seed.MedicineBatches.AddRange(
                new MedicineBatch { BatchId = 1, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "B1-LOT", ExpiryDate = today.AddMonths(6), CurrentStock = 30, PurchasePrice = 5m, Status = "Active" },
                new MedicineBatch { BatchId = 2, TenantId = 1, BranchId = 2, MedicineId = 1, BatchNumber = "B2-LOT", ExpiryDate = today.AddMonths(8), CurrentStock = 12, PurchasePrice = 5m, Status = "Active" });
            await seed.SaveChangesAsync();
        }

        var b2Ctx = new MutableTenantContext { TenantId = 1, BranchId = 2 };
        await using var db2 = CreateDb(b2Ctx, dbName);
        var medRepo = new MedicineRepository(db2);

        var dto = await medRepo.GetByIdAsync(1);
        Assert.NotNull(dto);
        Assert.Single(dto!.Batches);
        Assert.Equal("B2-LOT", dto.Batches[0].BatchNumber);
        Assert.Equal(12, dto.Batches[0].RemainingQuantity);

        Assert.True(await medRepo.BatchExistsAsync(1, "b2-lot"));
        Assert.False(await medRepo.BatchExistsAsync(1, "B1-LOT"));
        Assert.False(await medRepo.BatchExistsAsync(1, "LEGACY-CATALOG"));
    }

    [Fact]
    public async Task SalesRepository_GetBatchesForMedicine_ExcludesExpiredRecalledAndQuarantined()
    {
        var dbName = Guid.NewGuid().ToString();
        var today = BdToday();

        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using var db = CreateDb(ctx, dbName);
        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Seclo", StockQuantity = 50, SalePrice = 6m });
        db.MedicineBatches.AddRange(
            new MedicineBatch { BatchId = 1, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "EXP-1", ExpiryDate = today.AddDays(-1), CurrentStock = 10, Status = "Active" },
            new MedicineBatch { BatchId = 2, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "REC-1", ExpiryDate = today.AddDays(30), CurrentStock = 10, Status = "Recalled" },
            new MedicineBatch { BatchId = 3, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "QUA-1", ExpiryDate = today.AddDays(30), CurrentStock = 10, Status = "Quarantined" },
            new MedicineBatch { BatchId = 4, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "ACT-1", ExpiryDate = today.AddDays(60), CurrentStock = 8, SalePrice = 6m, Status = "Active" });
        await db.SaveChangesAsync();

        var salesRepo = new SalesRepository(db, ctx);
        var batches = (await salesRepo.GetBatchesForMedicineAsync(1)).ToList();

        Assert.Single(batches);
        Assert.Equal("ACT-1", batches[0].BatchNumber);
        Assert.True(batches[0].IsSellable);
    }

    [Fact]
    public async Task PurchaseRepository_LinksPurchaseDetailId_AndBlocksRecalledOrQuarantinedRestock()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using var db = CreateDb(ctx, dbName);

        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "T1", IsActive = true });
        db.Branches.Add(new Branch { BranchId = 1, TenantId = 1, BranchName = "HO", IsHeadOffice = true, IsActive = true });
        db.Parties.Add(new Party { PartyId = 1, TenantId = 1, Code = "SUP-1", PartyType = "Supplier", FullName = "ACI", Cell = "01700000000" });
        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa", SalePrice = 5m });
        db.MedicineBatches.Add(new MedicineBatch
        {
            BatchId = 99, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "RECALLED-99",
            ExpiryDate = BdToday().AddYears(1), CurrentStock = 5, Status = "Recalled"
        });
        await db.SaveChangesAsync();

        var repo = new PurchaseRepository(db, ctx);

        // 1. Fresh purchase links PurchaseDetailId onto created MedicineBatch
        var okPurchase = await repo.CreateAsync(new PurchaseMasterDto
        {
            SupplierId = 1,
            GrandTotal = 100m,
            PaidAmount = 100m,
            PurchaseDetails =
            {
                new PurchaseDetailDto { MedicineId = 1, BatchNumber = "NEW-LOT-1", Quantity = 20, UnitCost = 5m, SalePrice = 7m, LineTotal = 100m }
            }
        }, "admin1");

        var savedDetail = await db.PurchaseDetails.SingleAsync(d => d.BatchNumber == "NEW-LOT-1");
        var savedBatch = await db.MedicineBatches.SingleAsync(b => b.BatchNumber == "NEW-LOT-1");
        Assert.Equal(savedDetail.PurchaseDetailId, savedBatch.PurchaseDetailId);
        Assert.True(okPurchase.PurchaseId > 0);

        // 2. Attempting to restock Recalled batch MUST throw and rollback PurchaseMaster
        await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(new PurchaseMasterDto
        {
            SupplierId = 1,
            GrandTotal = 50m,
            PaidAmount = 50m,
            PurchaseDetails =
            {
                new PurchaseDetailDto { MedicineId = 1, BatchNumber = "RECALLED-99", Quantity = 10, UnitCost = 5m, LineTotal = 50m }
            }
        }, "admin1"));

        var recalledBatch = await db.MedicineBatches.SingleAsync(b => b.BatchId == 99);
        Assert.Equal("Recalled", recalledBatch.Status);
        Assert.Equal(5, recalledBatch.CurrentStock);
        Assert.Equal(1, await db.PurchaseMasters.CountAsync());
    }

    [Fact]
    public async Task SuppliersController_ReadsAndWritesUnifiedPartiesTable_AndProtectsUsedSuppliers()
    {
        var dbName = Guid.NewGuid().ToString();
        var ctx = new MutableTenantContext { TenantId = 1, BranchId = null };
        await using var db = CreateDb(ctx, dbName);

        var partyRepo = new PartyRepository(db);
        var controller = new SuppliersController(db, partyRepo);

        var actionRes = await controller.PostSupplier(new SupplierDto
        {
            Name = "Square Pharma",
            Phone = "01711223344",
            Email = "sq@pharma.test",
            Address = "Dhaka"
        });
        var postRes = Assert.IsType<CreatedAtActionResult>(actionRes.Result);
        var created = Assert.IsType<SupplierDto>(postRes.Value);
        Assert.True(created.SupplierId > 0);

        // Stored inside Parties table (not legacy Suppliers)
        var inParties = await db.Parties.SingleAsync(p => p.PartyId == created.SupplierId);
        Assert.Equal("Supplier", inParties.PartyType);
        Assert.Empty(await db.Suppliers.ToListAsync());

        // Put & GetById use Parties
        Assert.IsType<NoContentResult>(await controller.PutSupplier(created.SupplierId, new SupplierDto
        {
            SupplierId = created.SupplierId,
            Name = "Square Pharma Ltd",
            Phone = "01711223344",
            IsActive = true
        }));
        var fetched = await controller.GetSupplier(created.SupplierId);
        Assert.Equal("Square Pharma Ltd", fetched.Value!.Name);

        // Referenced by PurchaseMaster -> Delete soft-deactivates instead of deleting
        db.PurchaseMasters.Add(new PurchaseMaster
        {
            PurchaseId = 10, TenantId = 1, BranchId = 1, PartyId = created.SupplierId,
            GrnCode = "GRN-00010", GrandTotal = 10m
        });
        await db.SaveChangesAsync();

        Assert.IsType<NoContentResult>(await controller.DeleteSupplier(created.SupplierId));
        var softDisabled = await db.Parties.SingleAsync(p => p.PartyId == created.SupplierId);
        Assert.False(softDisabled.IsActive);
    }

    [Fact]
    public void ReportRepositoryAndVisualDashboard_InvariantsEnforced()
    {
        var root = FindRepositoryRoot();
        var reportSrc = File.ReadAllText(Path.Combine(root, "Repositories", "ReportRepository.cs"));
        Assert.DoesNotContain("DateTime.Now", reportSrc, StringComparison.Ordinal);

        var dashSrc = File.ReadAllText(Path.Combine(root, "frontend", "src", "app", "components", "analytics", "visual-dashboard.component.ts"));
        Assert.Contains("totalCostOfGoodsSold", dashSrc, StringComparison.Ordinal);
        Assert.Contains("grossProfit", dashSrc, StringComparison.Ordinal);
        Assert.Contains("totalQuantitySold", dashSrc, StringComparison.Ordinal);
        Assert.Contains("medicineName", dashSrc, StringComparison.Ordinal);
        Assert.Contains("remainingStock", dashSrc, StringComparison.Ordinal);
        Assert.DoesNotContain("profitLossData?.totalCost ", dashSrc, StringComparison.Ordinal);
        Assert.DoesNotContain("profitLossData?.totalProfit ", dashSrc, StringComparison.Ordinal);
        Assert.DoesNotContain("d.stockQuantity", dashSrc, StringComparison.Ordinal);
    }
}
