using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.Filters;
using PharmacyApi.Services;
using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BatchesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ITenantContextService _ctx;

        private static readonly Dictionary<string, string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Active"] = "Active",
            ["Recalled"] = "Recalled",
            ["Quarantined"] = "Quarantined"
        };

        public BatchesController(ApplicationDbContext db, ITenantContextService ctx)
        {
            _db = db;
            _ctx = ctx;
        }

        private bool HasValidCallerScope() =>
            _ctx.IsSystemAdmin || (_ctx.TenantId.HasValue && _ctx.TenantId.Value > 0);

        private static DateTime BdToday() =>
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time")).Date;

        // ── GET /api/batches ──────────────────────────────────────────────────
        [HttpGet]
        [ModulePermission("Batches", "view")]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? medicineId = null,
            [FromQuery] int? branchId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null,
            [FromQuery] int? tenantId = null,
            [FromQuery] bool includeZeroStock = false)
        {
            if (!HasValidCallerScope()) return Unauthorized();

            var today = BdToday();

            var query = _ctx.IsSystemAdmin
                ? _db.MedicineBatches.IgnoreQueryFilters().AsNoTracking()
                : _db.MedicineBatches.AsNoTracking();

            if (_ctx.IsSystemAdmin && tenantId.HasValue && tenantId.Value > 0)
                query = query.Where(b => b.TenantId == tenantId.Value);

            if ((_ctx.IsSystemAdmin || _ctx.CanAccessAllBranches) && branchId.HasValue && branchId.Value > 0)
                query = query.Where(b => b.BranchId == branchId.Value);

            if (medicineId.HasValue && medicineId.Value > 0)
                query = query.Where(b => b.MedicineId == medicineId.Value);

            if (!string.IsNullOrWhiteSpace(status) && AllowedStatuses.TryGetValue(status.Trim(), out var normalizedStatus))
                query = query.Where(b => b.Status == normalizedStatus);

            if (!includeZeroStock)
                query = query.Where(b => b.CurrentStock > 0);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(b =>
                    b.BatchNumber.ToLower().Contains(term) ||
                    (b.Medicine != null && (b.Medicine.Name.ToLower().Contains(term) || b.Medicine.Code.ToLower().Contains(term))));
            }

            IQueryable<Models.Branch> branchQuery = _ctx.IsSystemAdmin
                ? _db.Branches.IgnoreQueryFilters().AsNoTracking()
                : _db.Branches.AsNoTracking();
            if (_ctx.IsSystemAdmin && tenantId.HasValue && tenantId.Value > 0)
                branchQuery = branchQuery.Where(br => br.TenantId == tenantId.Value);

            var branchNames = await branchQuery
                .Select(br => new { br.BranchId, br.BranchName })
                .ToDictionaryAsync(br => br.BranchId, br => br.BranchName);

            var raw = await query
                .OrderBy(b => b.Status == "Active" ? 0 : 1)
                .ThenBy(b => b.ExpiryDate)
                .ThenBy(b => b.ReceivedAt)
                .Select(b => new
                {
                    b.BatchId,
                    b.TenantId,
                    b.BranchId,
                    b.MedicineId,
                    MedicineName = b.Medicine != null ? b.Medicine.Name : "",
                    MedicineCode = b.Medicine != null ? b.Medicine.Code : "",
                    b.BatchNumber,
                    b.ExpiryDate,
                    b.CurrentStock,
                    b.PurchasePrice,
                    b.SalePrice,
                    b.Status,
                    b.ReceivedAt,
                    b.PurchaseDetailId,
                    b.CreatedBy,
                    b.CreatedAt
                })
                .ToListAsync();

            var items = raw.Select(b => new
            {
                b.BatchId,
                b.TenantId,
                b.BranchId,
                BranchName = branchNames.TryGetValue(b.BranchId, out var bn) ? bn : "",
                b.MedicineId,
                b.MedicineName,
                b.MedicineCode,
                b.BatchNumber,
                b.ExpiryDate,
                IsExpired = b.ExpiryDate.Date < today,
                IsNearExpiry = b.ExpiryDate.Date >= today && b.ExpiryDate.Date <= today.AddDays(90),
                b.CurrentStock,
                b.PurchasePrice,
                b.SalePrice,
                b.Status,
                b.ReceivedAt,
                b.PurchaseDetailId,
                b.CreatedBy,
                b.CreatedAt
            });

            return Ok(items);
        }

        // ── PATCH /api/batches/{id}/status ────────────────────────────────────
        // ARCHITECTURAL INTENT: Only SystemAdmin or Tenant Admin may mark a batch Recalled/Quarantined or restore Active.
        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "SystemAdmin,Admin")]
        [ModulePermission("Batches", "edit")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateBatchStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!HasValidCallerScope()) return Unauthorized();
            if (!_ctx.IsSystemAdmin && !_ctx.CanAccessAllBranches)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "শুধুমাত্র Tenant Admin বা SystemAdmin ব্যাচ স্ট্যাটাস পরিবর্তন করতে পারবেন।" });

            if (string.IsNullOrWhiteSpace(dto.Status) || !AllowedStatuses.TryGetValue(dto.Status.Trim(), out var normalizedStatus))
                return BadRequest(new { message = "অনুমোদিত স্ট্যাটাস: Active, Recalled, বা Quarantined।" });

            var batch = _ctx.IsSystemAdmin
                ? await _db.MedicineBatches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.BatchId == id)
                : await _db.MedicineBatches.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(b => b.BatchId == id && b.TenantId == _ctx.TenantId!.Value);

            if (batch == null) return NotFound();

            batch.Status = normalizedStatus;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                batch.BatchId,
                batch.BatchNumber,
                batch.BranchId,
                batch.Status
            });
        }
    }

    public class UpdateBatchStatusDto
    {
        [Required]
        [StringLength(20)]
        public string Status { get; set; } = string.Empty;
    }
}
