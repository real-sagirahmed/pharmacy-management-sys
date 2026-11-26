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
/// Regression tests locking GAP-10 invariants:
/// - SalesPayment, PurchasePayment, SalesDetail, PurchaseDetail enforce parent-derived Tier-2 Global Query Filters
/// - PaymentRepository scopes all dues, history, and mutation queries via ScopedSalesQuery / ScopedPurchasesQuery
/// - Cross-tenant, cross-branch, and missing-tenant IDOR attempts return 404 / empty (even with tracked ChangeTracker entities)
/// - PurchasePayment history preserves CreatedAt, bulk mutations reject negative rows & clamp rounding zeros,
///   and PaymentRepository contains zero FindAsync() or manual BeginTransactionAsync() calls.
/// </summary>
public class PaymentTenantAndBranchIdorTests
{
    private sealed class MutableTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;
    }

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

    private static async Task SeedMultiTenantPaymentsAsync(string dbName)
    {
        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using var db = CreateDb(seedCtx, dbName);

        db.Tenants.AddRange(
            new Tenant { TenantId = 1, PharmacyName = "Pharmacy One", IsActive = true },
            new Tenant { TenantId = 2, PharmacyName = "Pharmacy Two", IsActive = true });

        db.Branches.AddRange(
            new Branch { BranchId = 1, TenantId = 1, BranchName = "T1 Main", IsHeadOffice = true, IsActive = true },
            new Branch { BranchId = 2, TenantId = 1, BranchName = "T1 Banani", IsHeadOffice = false, IsActive = true },
            new Branch { BranchId = 3, TenantId = 2, BranchName = "T2 Main", IsHeadOffice = true, IsActive = true });

        db.Parties.AddRange(
            new Party { PartyId = 1, TenantId = 1, Code = "SUP-1", FullName = "T1 Supplier" },
            new Party { PartyId = 2, TenantId = 2, Code = "SUP-2", FullName = "T2 Supplier" });

        db.Medicines.AddRange(
            new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa 500", SalePrice = 10m },
            new Medicine { MedicineId = 2, TenantId = 2, Code = "MED-2", Name = "Ace 500", SalePrice = 10m });

        db.SalesMasters.AddRange(
            new SalesMaster
            {
                SaleId = 1, TenantId = 1, BranchId = 1, InvoiceCode = "INV-T1B1-1",
                CustomerName = "Cust T1B1 PaidPart", GrandTotal = 1000m, PaidAmount = 500m, DueAmount = 500m, PaymentStatus = "Partial"
            },
            new SalesMaster
            {
                SaleId = 2, TenantId = 1, BranchId = 1, InvoiceCode = "INV-T1B1-2",
                CustomerName = "Cust T1B1 Unpaid", GrandTotal = 300m, PaidAmount = 0m, DueAmount = 300m, PaymentStatus = "Due"
            },
            new SalesMaster
            {
                SaleId = 3, TenantId = 1, BranchId = 2, InvoiceCode = "INV-T1B2-3",
                CustomerName = "Cust T1B2 Secret", GrandTotal = 500m, PaidAmount = 100m, DueAmount = 400m, PaymentStatus = "Partial"
            },
            new SalesMaster
            {
                SaleId = 4, TenantId = 2, BranchId = 3, InvoiceCode = "INV-T2B3-4",
                CustomerName = "Cust T2 Secret", GrandTotal = 1000m, PaidAmount = 200m, DueAmount = 800m, PaymentStatus = "Partial"
            });

        db.SalesDetails.AddRange(
            new SalesDetail { SalesDetailId = 1, SaleId = 1, MedicineId = 1, BatchNumber = "B1", Quantity = 2, UnitPrice = 500m, LineTotal = 1000m },
            new SalesDetail { SalesDetailId = 2, SaleId = 3, MedicineId = 1, BatchNumber = "B2", Quantity = 1, UnitPrice = 500m, LineTotal = 500m },
            new SalesDetail { SalesDetailId = 3, SaleId = 4, MedicineId = 2, BatchNumber = "B3", Quantity = 2, UnitPrice = 500m, LineTotal = 1000m });

        db.SalesPayments.AddRange(
            new SalesPayment
            {
                SalesPaymentId = 1, SaleId = 1, PaymentMethod = "MobileBanking", Amount = 500m,
                AccountNumber = "01711-T1B1", TransactionId = "TX-T1B1", Remarks = "Part 1",
                CreatedAt = new DateTime(2026, 11, 20, 10, 15, 0)
            },
            new SalesPayment
            {
                SalesPaymentId = 2, SaleId = 3, PaymentMethod = "Bank", Amount = 100m,
                AccountNumber = "AC-T1B2-SECRET", TransactionId = "TX-T1B2", Remarks = "Branch 2 only",
                CreatedAt = new DateTime(2026, 11, 21, 11, 0, 0)
            },
            new SalesPayment
            {
                SalesPaymentId = 3, SaleId = 4, PaymentMethod = "MobileBanking", Amount = 200m,
                AccountNumber = "01999-T2-SECRET", TransactionId = "TX-T2-SECRET", Remarks = "Tenant 2 only",
                CreatedAt = new DateTime(2026, 11, 22, 12, 0, 0)
            });

        var purchaseCreatedAt = new DateTime(2026, 11, 20, 14, 30, 0);
        db.PurchaseMasters.AddRange(
            new PurchaseMaster
            {
                PurchaseId = 1, TenantId = 1, BranchId = 1, PartyId = 1, GrnCode = "GRN-T1B1-1",
                GrandTotal = 1000m, PaidAmount = 400m, DueAmount = 600m, PaymentStatus = "Partial"
            },
            new PurchaseMaster
            {
                PurchaseId = 2, TenantId = 1, BranchId = 2, PartyId = 1, GrnCode = "GRN-T1B2-2",
                GrandTotal = 250m, PaidAmount = 0m, DueAmount = 250m, PaymentStatus = "Due"
            },
            new PurchaseMaster
            {
                PurchaseId = 3, TenantId = 2, BranchId = 3, PartyId = 2, GrnCode = "GRN-T2B3-3",
                GrandTotal = 1000m, PaidAmount = 100m, DueAmount = 900m, PaymentStatus = "Partial"
            });

        db.PurchaseDetails.AddRange(
            new PurchaseDetail { PurchaseDetailId = 1, PurchaseId = 1, MedicineId = 1, BatchNumber = "B1", Quantity = 100, UnitCost = 10m, SalePrice = 12m, LineTotal = 1000m },
            new PurchaseDetail { PurchaseDetailId = 2, PurchaseId = 2, MedicineId = 1, BatchNumber = "B2", Quantity = 25, UnitCost = 10m, SalePrice = 12m, LineTotal = 250m },
            new PurchaseDetail { PurchaseDetailId = 3, PurchaseId = 3, MedicineId = 2, BatchNumber = "B3", Quantity = 100, UnitCost = 10m, SalePrice = 12m, LineTotal = 1000m });

        db.PurchasePayments.AddRange(
            new PurchasePayment
            {
                PurchasePaymentId = 1, PurchaseId = 1, PaymentMethod = "Bank", Amount = 400m,
                AccountNumber = "SUP-ACC-T1B1", TransactionId = "PTX-T1B1", Remarks = "Initial",
                CreatedAt = purchaseCreatedAt
            },
            new PurchasePayment
            {
                PurchasePaymentId = 2, PurchaseId = 3, PaymentMethod = "Bank", Amount = 100m,
                AccountNumber = "SUP-ACC-T2-SECRET", TransactionId = "PTX-T2-SECRET", Remarks = "Tenant 2",
                CreatedAt = purchaseCreatedAt
            });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task PaymentHistory_CrossTenantAndCrossBranch_BlockedAndReturnsNotFound()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantPaymentsAsync(dbName);

        // 1. Tenant 1, Branch 1 restricted user
        var t1B1Ctx = new MutableTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = 1 };
        await using (var db = CreateDb(t1B1Ctx, dbName))
        {
            var repo = new PaymentRepository(db, t1B1Ctx);
            var controller = new PaymentsController(repo);

            // Cross-tenant & cross-branch & non-existent histories return 404 NotFound
            Assert.IsType<NotFoundResult>(await controller.GetSalesHistory(4));   // T2 B3
            Assert.IsType<NotFoundResult>(await controller.GetSalesHistory(3));   // T1 B2
            Assert.IsType<NotFoundResult>(await controller.GetSalesHistory(999)); // Missing
            Assert.IsType<NotFoundResult>(await controller.GetPurchaseHistory(3)); // T2 B3
            Assert.IsType<NotFoundResult>(await controller.GetPurchaseHistory(2)); // T1 B2

            // Valid own invoice with 0 payments returns 200 OK []
            var emptyOk = Assert.IsType<OkObjectResult>(await controller.GetSalesHistory(2));
            var emptyList = Assert.IsAssignableFrom<IEnumerable<SalesPaymentDto>>(emptyOk.Value);
            Assert.Empty(emptyList);

            // Valid own sale & purchase return 200 OK with expected fields including Purchase CreatedAt
            var saleOk = Assert.IsType<OkObjectResult>(await controller.GetSalesHistory(1));
            var saleList = Assert.IsAssignableFrom<IEnumerable<SalesPaymentDto>>(saleOk.Value).ToList();
            Assert.Single(saleList);
            Assert.Equal("01711-T1B1", saleList[0].AccountNumber);
            Assert.Equal("TX-T1B1", saleList[0].TransactionId);

            var purchOk = Assert.IsType<OkObjectResult>(await controller.GetPurchaseHistory(1));
            var purchList = Assert.IsAssignableFrom<IEnumerable<PurchasePaymentDto>>(purchOk.Value).ToList();
            Assert.Single(purchList);
            Assert.Equal("SUP-ACC-T1B1", purchList[0].AccountNumber);
            Assert.Equal(new DateTime(2026, 11, 20, 14, 30, 0), purchList[0].CreatedAt);
        }

        // 2. Tenant 1 Admin (BranchId = null) sees T1 B2, still blocked from T2 B3
        var t1AdminCtx = new MutableTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = null };
        await using (var db = CreateDb(t1AdminCtx, dbName))
        {
            var controller = new PaymentsController(new PaymentRepository(db, t1AdminCtx));
            var t1b2Ok = Assert.IsType<OkObjectResult>(await controller.GetSalesHistory(3));
            var t1b2List = Assert.IsAssignableFrom<IEnumerable<SalesPaymentDto>>(t1b2Ok.Value).ToList();
            Assert.Single(t1b2List);
            Assert.Equal("AC-T1B2-SECRET", t1b2List[0].AccountNumber);

            Assert.IsType<NotFoundResult>(await controller.GetSalesHistory(4));
            Assert.IsType<NotFoundResult>(await controller.GetPurchaseHistory(3));
        }
    }

    [Fact]
    public async Task DirectChildDbSetQueries_EnforceParentDerivedTier2Filters()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantPaymentsAsync(dbName);

        // Tenant 1, Branch 1 sees only Branch 1 child rows
        var b1Ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using (var db = CreateDb(b1Ctx, dbName))
        {
            var spIds = await db.SalesPayments.Select(x => x.SalesPaymentId).ToListAsync();
            var ppIds = await db.PurchasePayments.Select(x => x.PurchasePaymentId).ToListAsync();
            var sdIds = await db.SalesDetails.Select(x => x.SalesDetailId).ToListAsync();
            var pdIds = await db.PurchaseDetails.Select(x => x.PurchaseDetailId).ToListAsync();

            Assert.Equal(new[] { 1 }, spIds);
            Assert.Equal(new[] { 1 }, ppIds);
            Assert.Equal(new[] { 1 }, sdIds);
            Assert.Equal(new[] { 1 }, pdIds);
        }

        // Tenant 1 Admin sees both T1 branches, zero T2 rows
        var admCtx = new MutableTenantContext { TenantId = 1, BranchId = null };
        await using (var db = CreateDb(admCtx, dbName))
        {
            var spIds = await db.SalesPayments.OrderBy(x => x.SalesPaymentId).Select(x => x.SalesPaymentId).ToListAsync();
            var sdIds = await db.SalesDetails.OrderBy(x => x.SalesDetailId).Select(x => x.SalesDetailId).ToListAsync();
            var pdIds = await db.PurchaseDetails.OrderBy(x => x.PurchaseDetailId).Select(x => x.PurchaseDetailId).ToListAsync();

            Assert.Equal(new[] { 1, 2 }, spIds);
            Assert.Equal(new[] { 1, 2 }, sdIds);
            Assert.Equal(new[] { 1, 2 }, pdIds);
        }

        // Missing tenant context returns zero rows
        var anonCtx = new MutableTenantContext { IsSystemAdmin = false, TenantId = null };
        await using (var db = CreateDb(anonCtx, dbName))
        {
            Assert.Empty(await db.SalesPayments.ToListAsync());
            Assert.Empty(await db.PurchasePayments.ToListAsync());
            Assert.Empty(await db.SalesDetails.ToListAsync());
            Assert.Empty(await db.PurchaseDetails.ToListAsync());
        }
    }

    [Fact]
    public async Task DueMutations_CrossTenantCrossBranchAndTrackedEntities_AllReturn404()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantPaymentsAsync(dbName);

        var t1B1Ctx = new MutableTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = 1 };
        await using var db = CreateDb(t1B1Ctx, dbName);

        // Deliberately pre-load all rows via IgnoreQueryFilters() into ChangeTracker to simulate
        // worst-case tracked entity state where legacy FindAsync() used to bypass filters.
        var trackedSales = await db.SalesMasters.IgnoreQueryFilters().ToListAsync();
        var trackedPurchases = await db.PurchaseMasters.IgnoreQueryFilters().ToListAsync();
        Assert.Equal(4, trackedSales.Count);
        Assert.Equal(3, trackedPurchases.Count);

        var controller = new PaymentsController(new PaymentRepository(db, t1B1Ctx));

        // Cross-tenant (T2) and cross-branch (T1 B2) probes on all 4 mutation endpoints -> 404 NotFound
        Assert.IsType<NotFoundObjectResult>(await controller.CollectSalesDue(new SalesPaymentDto { SaleId = 4, PaymentMethod = "Cash", Amount = 50m }));
        Assert.IsType<NotFoundObjectResult>(await controller.CollectSalesDue(new SalesPaymentDto { SaleId = 3, PaymentMethod = "Cash", Amount = 50m }));

        Assert.IsType<NotFoundObjectResult>(await controller.BulkCollectSalesDue(new BulkSalesPaymentDto
        {
            SaleId = 4,
            Payments = { new SalesPaymentDto { PaymentMethod = "Cash", Amount = 50m } }
        }));
        Assert.IsType<NotFoundObjectResult>(await controller.BulkCollectSalesDue(new BulkSalesPaymentDto
        {
            SaleId = 3,
            Payments = { new SalesPaymentDto { PaymentMethod = "Cash", Amount = 50m } }
        }));

        Assert.IsType<NotFoundObjectResult>(await controller.PayPurchaseDue(new PurchasePaymentDto { PurchaseId = 3, PaymentMethod = "Cash", Amount = 50m }));
        Assert.IsType<NotFoundObjectResult>(await controller.PayPurchaseDue(new PurchasePaymentDto { PurchaseId = 2, PaymentMethod = "Cash", Amount = 50m }));

        Assert.IsType<NotFoundObjectResult>(await controller.BulkPayPurchaseDue(new BulkPurchasePaymentDto
        {
            PurchaseId = 3,
            Payments = { new PurchasePaymentDto { PaymentMethod = "Cash", Amount = 50m } }
        }));
        Assert.IsType<NotFoundObjectResult>(await controller.BulkPayPurchaseDue(new BulkPurchasePaymentDto
        {
            PurchaseId = 2,
            Payments = { new PurchasePaymentDto { PaymentMethod = "Cash", Amount = 50m } }
        }));

        // Verify balances on T1 B2 and T2 B3 stayed untouched
        Assert.Equal(400m, (await db.SalesMasters.IgnoreQueryFilters().SingleAsync(s => s.SaleId == 3)).DueAmount);
        Assert.Equal(800m, (await db.SalesMasters.IgnoreQueryFilters().SingleAsync(s => s.SaleId == 4)).DueAmount);
        Assert.Equal(250m, (await db.PurchaseMasters.IgnoreQueryFilters().SingleAsync(p => p.PurchaseId == 2)).DueAmount);
        Assert.Equal(900m, (await db.PurchaseMasters.IgnoreQueryFilters().SingleAsync(p => p.PurchaseId == 3)).DueAmount);
    }

    [Fact]
    public async Task BulkPayments_RejectNegativeSplitRow_AndClampTinyRoundingZero()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantPaymentsAsync(dbName);

        var t1B1Ctx = new MutableTenantContext { IsSystemAdmin = false, TenantId = 1, BranchId = 1 };
        await using var db = CreateDb(t1B1Ctx, dbName);
        var controller = new PaymentsController(new PaymentRepository(db, t1B1Ctx));

        // 1. Negative row in split sales payment must fail with 400 even when sum is positive
        var negSaleRes = await controller.BulkCollectSalesDue(new BulkSalesPaymentDto
        {
            SaleId = 1,
            Payments =
            {
                new SalesPaymentDto { PaymentMethod = "Cash", Amount = 500m },
                new SalesPaymentDto { PaymentMethod = "Bank", Amount = -400m }
            }
        });
        Assert.IsType<BadRequestObjectResult>(negSaleRes);
        Assert.Equal(500m, (await db.SalesMasters.SingleAsync(s => s.SaleId == 1)).DueAmount);

        // 2. Same for bulk purchase payment
        var negPurchRes = await controller.BulkPayPurchaseDue(new BulkPurchasePaymentDto
        {
            PurchaseId = 1,
            Payments =
            {
                new PurchasePaymentDto { PaymentMethod = "Cash", Amount = 400m },
                new PurchasePaymentDto { PaymentMethod = "Bank", Amount = -200m }
            }
        });
        Assert.IsType<BadRequestObjectResult>(negPurchRes);
        Assert.Equal(600m, (await db.PurchaseMasters.SingleAsync(p => p.PurchaseId == 1)).DueAmount);

        // 3. Valid bulk pay within 0.01m rounding tolerance clamps DueAmount to 0m (never -0.01m)
        var okSaleRes = await controller.BulkCollectSalesDue(new BulkSalesPaymentDto
        {
            SaleId = 1,
            Payments =
            {
                new SalesPaymentDto { PaymentMethod = "Cash", Amount = 300m },
                new SalesPaymentDto { PaymentMethod = "MobileBanking", Amount = 200.01m, TransactionId = "MB-99" }
            }
        });
        Assert.IsType<OkObjectResult>(okSaleRes);
        var updatedSale = await db.SalesMasters.SingleAsync(s => s.SaleId == 1);
        Assert.Equal(0m, updatedSale.DueAmount);
        Assert.Equal("Paid", updatedSale.PaymentStatus);

        var okPurchRes = await controller.BulkPayPurchaseDue(new BulkPurchasePaymentDto
        {
            PurchaseId = 1,
            Payments =
            {
                new PurchasePaymentDto { PaymentMethod = "Cash", Amount = 600.01m }
            }
        });
        Assert.IsType<OkObjectResult>(okPurchRes);
        var updatedPurchase = await db.PurchaseMasters.SingleAsync(p => p.PurchaseId == 1);
        Assert.Equal(0m, updatedPurchase.DueAmount);
        Assert.Equal("Paid", updatedPurchase.PaymentStatus);
    }

    [Fact]
    public async Task MissingTenantContext_FailsClosedAcrossAllPaymentMethods()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantPaymentsAsync(dbName);

        var missingCtx = new MutableTenantContext { IsSystemAdmin = false, TenantId = null, BranchId = null };
        await using var db = CreateDb(missingCtx, dbName);
        var repo = new PaymentRepository(db, missingCtx);

        Assert.Empty(await repo.GetSalesDuesAsync());
        Assert.Empty(await repo.GetPurchaseDuesAsync());
        Assert.Null(await repo.GetSalesPaymentHistoryAsync(1));
        Assert.Null(await repo.GetPurchasePaymentHistoryAsync(1));

        var s1 = await repo.CollectSalesDueAsync(new SalesPaymentDto { SaleId = 1, PaymentMethod = "Cash", Amount = 10m });
        var p1 = await repo.PayPurchaseDueAsync(new PurchasePaymentDto { PurchaseId = 1, PaymentMethod = "Cash", Amount = 10m });
        var s2 = await repo.BulkCollectSalesDueAsync(new BulkSalesPaymentDto { SaleId = 1, Payments = { new SalesPaymentDto { PaymentMethod = "Cash", Amount = 10m } } });
        var p2 = await repo.BulkPayPurchaseDueAsync(new BulkPurchasePaymentDto { PurchaseId = 1, Payments = { new PurchasePaymentDto { PaymentMethod = "Cash", Amount = 10m } } });

        Assert.False(s1.Success);
        Assert.Contains("not found", s1.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(p1.Success);
        Assert.Contains("not found", p1.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(s2.Success);
        Assert.Contains("not found", s2.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(p2.Success);
        Assert.Contains("not found", p2.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void PaymentRepositoryAndDbContext_ArchitecturalLocks_Enforced()
    {
        var ctx = new MutableTenantContext { TenantId = 1 };
        using var db = CreateDb(ctx, Guid.NewGuid().ToString());

        // 1. All 4 Tier-2 child entities MUST have EF Core Global Query Filters registered
        foreach (var childType in new[] { typeof(SalesPayment), typeof(PurchasePayment), typeof(SalesDetail), typeof(PurchaseDetail) })
        {
            var entityType = db.Model.FindEntityType(childType);
            Assert.NotNull(entityType);
            Assert.NotNull(entityType!.GetQueryFilter());
        }

        // 2. PaymentRepository must use ExecuteInTransactionAsync + AcquireTransactionAppLockAsync and zero FindAsync / BeginTransaction
        var root = FindRepositoryRoot();
        var repoSrc = File.ReadAllText(Path.Combine(root, "Repositories", "PaymentRepository.cs"));
        Assert.DoesNotContain(".FindAsync(", repoSrc, StringComparison.Ordinal);
        Assert.DoesNotContain(".BeginTransaction", repoSrc, StringComparison.Ordinal);
        Assert.Contains("ExecuteInTransactionAsync", repoSrc, StringComparison.Ordinal);
        Assert.Contains("AcquireTransactionAppLockAsync", repoSrc, StringComparison.Ordinal);

        // 3. PaymentsController bulk actions must map "not found" cleanly via shared ToPaymentActionResult helper
        var ctrlSrc = File.ReadAllText(Path.Combine(root, "Controllers", "PaymentsController.cs"));
        Assert.Contains("ToPaymentActionResult", ctrlSrc, StringComparison.Ordinal);
        Assert.Contains("NotFound(", ctrlSrc, StringComparison.Ordinal);
    }
}
