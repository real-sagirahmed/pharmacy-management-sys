using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PharmacyApi.Controllers;
using PharmacyApi.Data;
using PharmacyApi.Filters;
using PharmacyApi.Models;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-11 invariants:
/// - BranchesController enforces Role & ModulePermission guards on branch & transfer endpoints
/// - Branch HasQueryFilter + explicit tenant scope block cross-tenant GetAll/Update/SetStatus
/// - RequestTransfer enforces branch boundary (FromBranchId == _ctx.BranchId) & max+1 TransferCode
/// - ApproveTransfer preserves sourceBatch.ReceivedAt (FEFO tie-breaker) and PurchaseDetailId
/// - RejectTransfer transitions Pending -> Rejected without mutating stock, and GetTransfers projects branch names & branch boundaries
/// </summary>
public class BranchControllerSecurityAndTransferTests
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

    private static BranchesController CreateController(
        ApplicationDbContext db,
        ITenantContextService ctx,
        string userName = "tester",
        string role = "Admin")
    {
        return new BranchesController(db, ctx)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.Name, userName),
                        new Claim(ClaimTypes.Role, role)
                    }, "Test"))
                }
            }
        };
    }

    private static async Task SeedMultiTenantBranchesAsync(string dbName)
    {
        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using var db = CreateDb(seedCtx, dbName);

        db.Tenants.AddRange(
            new Tenant { TenantId = 1, PharmacyName = "Pharmacy One", IsActive = true },
            new Tenant { TenantId = 2, PharmacyName = "Pharmacy Two", IsActive = true });

        db.Branches.AddRange(
            new Branch { BranchId = 1, TenantId = 1, BranchName = "T1 Main HO", IsHeadOffice = true, IsActive = true },
            new Branch { BranchId = 2, TenantId = 1, BranchName = "T1 Gulshan", IsHeadOffice = false, IsActive = true },
            new Branch { BranchId = 4, TenantId = 1, BranchName = "T1 Uttara", IsHeadOffice = false, IsActive = true },
            new Branch { BranchId = 3, TenantId = 2, BranchName = "T2 Main HO", IsHeadOffice = true, IsActive = true });

        db.Medicines.Add(new Medicine { MedicineId = 1, TenantId = 1, Code = "MED-1", Name = "Napa 500", SalePrice = 5m });

        db.MedicineBatches.AddRange(
            new MedicineBatch
            {
                BatchId = 10, TenantId = 1, BranchId = 1, MedicineId = 1, BatchNumber = "B-OLD-FIFO",
                ExpiryDate = new DateTime(2028, 1, 1), CurrentStock = 50, PurchasePrice = 3m, SalePrice = 5m,
                Status = "Active", ReceivedAt = new DateTime(2025, 1, 15, 8, 0, 0), PurchaseDetailId = 777
            },
            new MedicineBatch
            {
                BatchId = 11, TenantId = 1, BranchId = 2, MedicineId = 1, BatchNumber = "B-RECALLED",
                ExpiryDate = new DateTime(2028, 1, 1), CurrentStock = 30, PurchasePrice = 3m, SalePrice = 5m,
                Status = "Recalled", ReceivedAt = new DateTime(2025, 2, 1, 9, 0, 0)
            });

        await db.SaveChangesAsync();
    }

    [Fact]
    public void BranchMutationAndTransferEndpoints_HaveStrictRoleAndModulePermissionGuards()
    {
        var type = typeof(BranchesController);
        Assert.NotNull(type.GetCustomAttribute<AuthorizeAttribute>());

        static void AssertGuards(Type t, string methodName, string? expectedRoles, string module, string action)
        {
            var m = t.GetMethod(methodName);
            Assert.NotNull(m);

            var auth = m!.GetCustomAttribute<AuthorizeAttribute>();
            if (expectedRoles != null)
            {
                Assert.NotNull(auth);
                Assert.Equal(expectedRoles, auth!.Roles);
            }

            var perm = m.GetCustomAttributes<ModulePermissionAttribute>().FirstOrDefault();
            Assert.NotNull(perm);
            Assert.Equal(module, perm!.Arguments![0]);
            Assert.Equal(action, perm.Arguments![1]);
        }

        AssertGuards(type, nameof(BranchesController.GetAll), null, "Branches", "view");
        AssertGuards(type, nameof(BranchesController.Create), "SystemAdmin,Admin", "Branches", "create");
        AssertGuards(type, nameof(BranchesController.Update), "SystemAdmin,Admin", "Branches", "edit");
        AssertGuards(type, nameof(BranchesController.SetStatus), "SystemAdmin,Admin", "Branches", "edit");
        AssertGuards(type, nameof(BranchesController.RequestTransfer), "SystemAdmin,Admin,Manager", "BranchTransfer", "create");
        AssertGuards(type, nameof(BranchesController.ApproveTransfer), "SystemAdmin,Admin", "BranchTransfer", "edit");
        AssertGuards(type, nameof(BranchesController.RejectTransfer), "SystemAdmin,Admin", "BranchTransfer", "edit");
        AssertGuards(type, nameof(BranchesController.GetTransfers), null, "BranchTransfer", "view");
    }

    [Fact]
    public async Task BranchCrud_CrossTenantIsolationAndHeadOfficeProtection_Enforced()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantBranchesAsync(dbName);

        var t1AdminCtx = new MutableTenantContext { TenantId = 1, BranchId = null };
        await using var db = CreateDb(t1AdminCtx, dbName);
        var controller = CreateController(db, t1AdminCtx, "t1admin", "Admin");

        // GetAll returns ONLY T1 branches (3 rows), never T2 branch
        var getAllRes = Assert.IsType<OkObjectResult>(await controller.GetAll(tenantId: 2));
        var branchJson = System.Text.Json.JsonSerializer.Serialize(getAllRes.Value);
        Assert.Contains("T1 Main HO", branchJson);
        Assert.DoesNotContain("T2 Main HO", branchJson);

        // Update & SetStatus against Tenant 2 BranchId 3 return 404 NotFound
        Assert.IsType<NotFoundResult>(await controller.Update(3, new UpdateBranchDto { BranchName = "Hacked" }));
        Assert.IsType<NotFoundResult>(await controller.SetStatus(3, false));

        // Deactivating Head Office Branch 1 blocked with BadRequest
        Assert.IsType<BadRequestObjectResult>(await controller.SetStatus(1, false));
        Assert.True((await db.Branches.IgnoreQueryFilters().SingleAsync(b => b.BranchId == 1)).IsActive);

        // Updating and deactivating own non-HO branch succeeds
        Assert.IsType<NoContentResult>(await controller.Update(2, new UpdateBranchDto { BranchName = "T1 Gulshan Updated" }));
        Assert.IsType<NoContentResult>(await controller.SetStatus(2, false));
        var updatedB2 = await db.Branches.IgnoreQueryFilters().SingleAsync(b => b.BranchId == 2);
        Assert.Equal("T1 Gulshan Updated", updatedB2.BranchName);
        Assert.False(updatedB2.IsActive);
    }

    [Fact]
    public async Task RequestTransfer_EnforcesBranchBoundary_AndRaceSafeMaxPlusOneTransferCode()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantBranchesAsync(dbName);

        var bdNow = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
        string prefix = $"TRF-{bdNow:yyyyMMdd}-";

        // Seed gap in TransferCode (00002 exists without 00001 -> Count=1, old Count+1 would collide on 00002!)
        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using (var seedDb = CreateDb(seedCtx, dbName))
        {
            seedDb.BranchTransfers.Add(new BranchTransfer
            {
                TransferId = 99, TenantId = 1, FromBranchId = 1, ToBranchId = 2, MedicineId = 1, BatchId = 10,
                BatchNumber = "B-OLD-FIFO", Quantity = 1, TransferCode = $"{prefix}00002", Status = "Completed"
            });
            await seedDb.SaveChangesAsync();
        }

        var b1MgrCtx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using var db = CreateDb(b1MgrCtx, dbName);
        var controller = CreateController(db, b1MgrCtx, "b1mgr", "Manager");

        // Branch 1 manager trying to request FROM Branch 2 -> 403 Forbidden
        var crossBranchRes = await controller.RequestTransfer(new BranchTransferRequestDto
        {
            FromBranchId = 2, ToBranchId = 4, BatchId = 11, Quantity = 5
        });
        var forbid = Assert.IsType<ObjectResult>(crossBranchRes);
        Assert.Equal(StatusCodes.Status403Forbidden, forbid.StatusCode);

        // Cross-tenant transfer (Branch 1 -> Branch 3) -> 400 BadRequest
        Assert.IsType<BadRequestObjectResult>(await controller.RequestTransfer(new BranchTransferRequestDto
        {
            FromBranchId = 1, ToBranchId = 3, BatchId = 10, Quantity = 5
        }));

        // Valid request (Branch 1 -> Branch 2) generates max+1 = 00003 instead of colliding on 00002
        var created = Assert.IsType<CreatedAtActionResult>(await controller.RequestTransfer(new BranchTransferRequestDto
        {
            FromBranchId = 1, ToBranchId = 2, BatchId = 10, Quantity = 5, Remarks = "Need stock"
        }));
        var createdJson = System.Text.Json.JsonSerializer.Serialize(created.Value);
        Assert.Contains($"{prefix}00003", createdJson);
    }

    [Fact]
    public async Task ApproveTransfer_PreservesReceivedAt_AndRejectsNonActiveBatch()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantBranchesAsync(dbName);

        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using (var seedDb = CreateDb(seedCtx, dbName))
        {
            seedDb.BranchTransfers.AddRange(
                new BranchTransfer
                {
                    TransferId = 1, TenantId = 1, FromBranchId = 1, ToBranchId = 2, MedicineId = 1, BatchId = 10,
                    BatchNumber = "B-OLD-FIFO", Quantity = 10, TransferCode = "TRF-20261126-00001", Status = "Pending"
                },
                new BranchTransfer
                {
                    TransferId = 2, TenantId = 1, FromBranchId = 2, ToBranchId = 4, MedicineId = 1, BatchId = 11,
                    BatchNumber = "B-RECALLED", Quantity = 5, TransferCode = "TRF-20261126-00002", Status = "Pending"
                });
            await seedDb.SaveChangesAsync();
        }

        var admCtx = new MutableTenantContext { TenantId = 1, BranchId = null };
        await using var db = CreateDb(admCtx, dbName);
        var controller = CreateController(db, admCtx, "t1admin", "Admin");

        // Approve valid Pending transfer -> destBatch MUST copy sourceBatch.ReceivedAt & PurchaseDetailId
        Assert.IsType<OkObjectResult>(await controller.ApproveTransfer(1));
        var destBatch = await db.MedicineBatches.IgnoreQueryFilters()
            .SingleAsync(b => b.BranchId == 2 && b.BatchNumber == "B-OLD-FIFO");
        Assert.Equal(10, destBatch.CurrentStock);
        Assert.Equal(new DateTime(2025, 1, 15, 8, 0, 0), destBatch.ReceivedAt);
        Assert.Equal(777, destBatch.PurchaseDetailId);

        // Recalled source batch transfer cannot be approved
        Assert.IsType<BadRequestObjectResult>(await controller.ApproveTransfer(2));
        Assert.False(await db.MedicineBatches.IgnoreQueryFilters().AnyAsync(b => b.BranchId == 4));
    }

    [Fact]
    public async Task RejectTransfer_CrossTenantReturns404_ValidUpdatesStatusWithoutStockMove()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantBranchesAsync(dbName);

        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using (var seedDb = CreateDb(seedCtx, dbName))
        {
            seedDb.BranchTransfers.Add(new BranchTransfer
            {
                TransferId = 5, TenantId = 1, FromBranchId = 1, ToBranchId = 2, MedicineId = 1, BatchId = 10,
                BatchNumber = "B-OLD-FIFO", Quantity = 12, TransferCode = "TRF-20261126-00005", Status = "Pending"
            });
            await seedDb.SaveChangesAsync();
        }

        // Tenant 2 Admin trying to reject Tenant 1 transfer -> 404 NotFound
        var t2Ctx = new MutableTenantContext { TenantId = 2, BranchId = null };
        await using (var dbT2 = CreateDb(t2Ctx, dbName))
        {
            var ctrlT2 = CreateController(dbT2, t2Ctx, "t2admin", "Admin");
            Assert.IsType<NotFoundResult>(await ctrlT2.RejectTransfer(5, new RejectTransferDto { Remarks = "Cross-tenant attack" }));
        }

        // Tenant 1 Admin rejects -> Status = Rejected, stock untouched (50), second reject/approve blocked
        var t1Ctx = new MutableTenantContext { TenantId = 1, BranchId = null };
        await using var dbT1 = CreateDb(t1Ctx, dbName);
        var ctrlT1 = CreateController(dbT1, t1Ctx, "t1admin", "Admin");
        var rejectOk = Assert.IsType<OkObjectResult>(await ctrlT1.RejectTransfer(5, new RejectTransferDto { Remarks = "Not approved" }));
        Assert.Contains("Rejected", System.Text.Json.JsonSerializer.Serialize(rejectOk.Value));

        var trf = await dbT1.BranchTransfers.SingleAsync(t => t.TransferId == 5);
        Assert.Equal("Rejected", trf.Status);
        Assert.Equal("Not approved", trf.Remarks);
        Assert.Equal("t1admin", trf.ApprovedBy);
        Assert.Equal(50, (await dbT1.MedicineBatches.IgnoreQueryFilters().SingleAsync(b => b.BatchId == 10)).CurrentStock);

        Assert.IsType<BadRequestObjectResult>(await ctrlT1.RejectTransfer(5));
        Assert.IsType<BadRequestObjectResult>(await ctrlT1.ApproveTransfer(5));
    }

    [Fact]
    public async Task GetTransfers_EnforcesBranchBoundaries_AndProjectsBranchNames()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedMultiTenantBranchesAsync(dbName);

        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using (var seedDb = CreateDb(seedCtx, dbName))
        {
            seedDb.BranchTransfers.AddRange(
                new BranchTransfer
                {
                    TransferId = 101, TenantId = 1, FromBranchId = 1, ToBranchId = 2, MedicineId = 1,
                    BatchNumber = "B1", Quantity = 2, TransferCode = "TRF-B1-B2", Status = "Pending"
                },
                new BranchTransfer
                {
                    TransferId = 102, TenantId = 1, FromBranchId = 2, ToBranchId = 4, MedicineId = 1,
                    BatchNumber = "B2", Quantity = 3, TransferCode = "TRF-B2-B4", Status = "Pending"
                },
                new BranchTransfer
                {
                    TransferId = 103, TenantId = 2, FromBranchId = 3, ToBranchId = 3, MedicineId = 1,
                    BatchNumber = "B3", Quantity = 1, TransferCode = "TRF-T2", Status = "Pending"
                });
            await seedDb.SaveChangesAsync();
        }

        // Branch 1 staff sees ONLY TRF-B1-B2 with FromBranchName/ToBranchName, never TRF-B2-B4 or TRF-T2
        var b1Ctx = new MutableTenantContext { TenantId = 1, BranchId = 1 };
        await using (var db = CreateDb(b1Ctx, dbName))
        {
            var ctrl = CreateController(db, b1Ctx, "b1mgr", "Manager");
            var res = Assert.IsType<OkObjectResult>(await ctrl.GetTransfers());
            var json = System.Text.Json.JsonSerializer.Serialize(res.Value);
            Assert.Contains("TRF-B1-B2", json);
            Assert.Contains("T1 Main HO", json);
            Assert.Contains("T1 Gulshan", json);
            Assert.DoesNotContain("TRF-B2-B4", json);
            Assert.DoesNotContain("TRF-T2", json);
        }

        // Tenant 1 Admin sees both T1 transfers, never T2
        var admCtx = new MutableTenantContext { TenantId = 1, BranchId = null };
        await using (var dbAdm = CreateDb(admCtx, dbName))
        {
            var ctrlAdm = CreateController(dbAdm, admCtx, "t1admin", "Admin");
            var resAdm = Assert.IsType<OkObjectResult>(await ctrlAdm.GetTransfers());
            var jsonAdm = System.Text.Json.JsonSerializer.Serialize(resAdm.Value);
            Assert.Contains("TRF-B1-B2", jsonAdm);
            Assert.Contains("TRF-B2-B4", jsonAdm);
            Assert.Contains("T1 Uttara", jsonAdm);
            Assert.DoesNotContain("TRF-T2", jsonAdm);
        }
    }
}
