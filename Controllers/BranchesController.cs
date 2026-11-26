using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.Filters;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BranchesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ITenantContextService _ctx;

        public BranchesController(ApplicationDbContext db, ITenantContextService ctx)
        {
            _db  = db;
            _ctx = ctx;
        }

        private static DateTime BdNow() =>
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));

        private bool HasValidCallerScope() =>
            _ctx.IsSystemAdmin || (_ctx.TenantId.HasValue && _ctx.TenantId.Value > 0);

        private IQueryable<Branch> ScopedBranchesQuery()
        {
            if (_ctx.IsSystemAdmin)
                return _db.Branches.IgnoreQueryFilters();

            if (!_ctx.TenantId.HasValue || _ctx.TenantId.Value <= 0)
                return _db.Branches.IgnoreQueryFilters().Where(_ => false);

            int tenantId = _ctx.TenantId.Value;
            return _db.Branches.IgnoreQueryFilters().Where(b => b.TenantId == tenantId);
        }

        private async Task<BranchTransfer?> FindScopedTransferAsync(int id, CancellationToken ct)
        {
            if (_ctx.IsSystemAdmin)
                return await _db.BranchTransfers.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TransferId == id, ct);

            if (!_ctx.TenantId.HasValue || _ctx.TenantId.Value <= 0)
                return null;

            int tenantId = _ctx.TenantId.Value;
            return await _db.BranchTransfers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.TransferId == id && t.TenantId == tenantId, ct);
        }

        // ── GET /api/branches ─────────────────────────────────────────────────
        // Tenant Admin / authorized staff → নিজের সব Branch
        // SystemAdmin → query param tenantId দিয়ে ফিল্টার করতে পারবে
        [HttpGet]
        [ModulePermission("Branches", "view")]
        public async Task<IActionResult> GetAll([FromQuery] int? tenantId)
        {
            if (!HasValidCallerScope())
                return Unauthorized();

            IQueryable<Branch> query = ScopedBranchesQuery().AsNoTracking();

            if (_ctx.IsSystemAdmin && tenantId.HasValue)
                query = query.Where(b => b.TenantId == tenantId.Value);

            var branches = await query
                .OrderBy(b => b.IsHeadOffice ? 0 : 1)
                .ThenBy(b => b.BranchName)
                .Select(b => new
                {
                    b.BranchId,
                    b.TenantId,
                    b.BranchName,
                    b.Address,
                    b.Phone,
                    b.DrugLicenseNo,
                    b.IsHeadOffice,
                    b.IsActive,
                    b.CreatedAt
                })
                .ToListAsync();

            return Ok(branches);
        }

        // ── POST /api/branches ────────────────────────────────────────────────
        // শুধু Tenant Admin বা SystemAdmin নতুন শাখা যুক্ত করতে পারবে
        [HttpPost]
        [Authorize(Roles = "SystemAdmin,Admin")]
        [ModulePermission("Branches", "create")]
        public async Task<IActionResult> Create([FromBody] CreateBranchDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!HasValidCallerScope()) return Unauthorized();

            // ARCHITECTURAL INTENT: Non-SystemAdmin Admin can only create branches inside their own TenantId.
            var targetTenantId = _ctx.IsSystemAdmin ? dto.TenantId : _ctx.TenantId;
            if (!targetTenantId.HasValue || targetTenantId.Value <= 0)
                return BadRequest("TenantId প্রয়োজন।");

            var tenantExists = await _db.Tenants.IgnoreQueryFilters()
                .AnyAsync(t => t.TenantId == targetTenantId.Value && t.IsActive);
            if (!tenantExists) return NotFound("Tenant পাওয়া যায়নি।");

            var branch = new Branch
            {
                TenantId      = targetTenantId.Value,
                BranchName    = dto.BranchName.Trim(),
                Address       = dto.Address?.Trim(),
                Phone         = dto.Phone?.Trim(),
                DrugLicenseNo = dto.DrugLicenseNo?.Trim(),
                IsHeadOffice  = dto.IsHeadOffice,
                IsActive      = true
            };

            _db.Branches.Add(branch);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { branch.BranchId });
        }

        // ── PUT /api/branches/{id} ────────────────────────────────────────────
        [HttpPut("{id:int}")]
        [Authorize(Roles = "SystemAdmin,Admin")]
        [ModulePermission("Branches", "edit")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateBranchDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!HasValidCallerScope()) return Unauthorized();

            var branch = await ScopedBranchesQuery().FirstOrDefaultAsync(b => b.BranchId == id);
            if (branch == null) return NotFound();

            branch.BranchName    = string.IsNullOrWhiteSpace(dto.BranchName) ? branch.BranchName : dto.BranchName.Trim();
            branch.Address       = dto.Address       ?? branch.Address;
            branch.Phone         = dto.Phone         ?? branch.Phone;
            branch.DrugLicenseNo = dto.DrugLicenseNo ?? branch.DrugLicenseNo;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── PATCH /api/branches/{id}/status ──────────────────────────────────
        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "SystemAdmin,Admin")]
        [ModulePermission("Branches", "edit")]
        public async Task<IActionResult> SetStatus(int id, [FromBody] bool isActive)
        {
            if (!HasValidCallerScope()) return Unauthorized();

            var branch = await ScopedBranchesQuery().FirstOrDefaultAsync(b => b.BranchId == id);
            if (branch == null) return NotFound();

            if (!_ctx.IsSystemAdmin && branch.IsHeadOffice && !isActive)
                return BadRequest("হেড অফিস শাখা নিষ্ক্রিয় করা যাবে না।");

            branch.IsActive = isActive;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── POST /api/branches/transfer ───────────────────────────────────────
        // ইন্টার-ব্রাঞ্চ স্টক ট্রান্সফার রিকোয়েস্ট (Pending state-এ তৈরি হয়)
        [HttpPost("transfer")]
        [Authorize(Roles = "SystemAdmin,Admin,Manager")]
        [ModulePermission("BranchTransfer", "create")]
        public async Task<IActionResult> RequestTransfer([FromBody] BranchTransferRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!HasValidCallerScope()) return Unauthorized();

            // ARCHITECTURAL INTENT: Branch-locked users may only initiate transfers FROM their assigned branch.
            if (!_ctx.IsSystemAdmin && !_ctx.CanAccessAllBranches && _ctx.BranchId.HasValue && dto.FromBranchId != _ctx.BranchId.Value)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "অন্য শাখা থেকে স্টক ট্রান্সফার অনুরোধ করার অনুমতি নেই।" });

            if (dto.FromBranchId == dto.ToBranchId)
                return BadRequest("একই শাখায় ট্রান্সফার করা যাবে না।");

            return await _db.ExecuteInTransactionAsync<IActionResult>(async ct =>
            {
                var branchesQuery = _db.Branches.IgnoreQueryFilters().AsNoTracking();
                var fromBranch = _ctx.IsSystemAdmin
                    ? await branchesQuery.FirstOrDefaultAsync(b => b.BranchId == dto.FromBranchId && b.IsActive, ct)
                    : await branchesQuery.FirstOrDefaultAsync(b => b.BranchId == dto.FromBranchId && b.TenantId == _ctx.TenantId!.Value && b.IsActive, ct);

                var toBranch = _ctx.IsSystemAdmin
                    ? await branchesQuery.FirstOrDefaultAsync(b => b.BranchId == dto.ToBranchId && b.IsActive, ct)
                    : await branchesQuery.FirstOrDefaultAsync(b => b.BranchId == dto.ToBranchId && b.TenantId == _ctx.TenantId!.Value && b.IsActive, ct);

                if (fromBranch == null || toBranch == null)
                    return (false, BadRequest("একটি বা উভয় শাখা পাওয়া যায়নি বা নিষ্ক্রিয়।"));

                if (fromBranch.TenantId != toBranch.TenantId)
                    return (false, BadRequest("দুটি ভিন্ন Tenant-এর শাখার মধ্যে ট্রান্সফার নিষিদ্ধ।"));

                int tenantId = fromBranch.TenantId;

                var batch = await _db.MedicineBatches
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(b =>
                        b.BatchId  == dto.BatchId &&
                        b.BranchId == dto.FromBranchId &&
                        b.TenantId == tenantId &&
                        b.Status   == "Active", ct);

                if (batch == null)
                    return (false, BadRequest("ব্যাচ পাওয়া যায়নি বা Active নয়।"));

                if (batch.CurrentStock < dto.Quantity)
                    return (false, BadRequest($"পর্যাপ্ত স্টক নেই। পাওয়া গেছে: {batch.CurrentStock} পিস।"));

                var bd = BdNow();
                string prefix = $"TRF-{bd:yyyyMMdd}-";

                // Race-safe per-tenant sequential TransferCode generation
                await _db.AcquireTransactionAppLockAsync($"SEQ_TRF_T{tenantId}_{bd:yyyyMMdd}", ct);
                var existingCodes = await _db.BranchTransfers
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(t => t.TenantId == tenantId && t.TransferCode.StartsWith(prefix))
                    .Select(t => t.TransferCode)
                    .ToListAsync(ct);

                int nextNum = SequenceCodeHelper.ComputeNextSequenceNumber(existingCodes, prefix);
                var code = $"{prefix}{nextNum:D5}";

                var requestedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "Unknown";

                var transfer = new BranchTransfer
                {
                    TenantId     = tenantId,
                    FromBranchId = dto.FromBranchId,
                    ToBranchId   = dto.ToBranchId,
                    MedicineId   = batch.MedicineId,
                    BatchId      = dto.BatchId,
                    BatchNumber  = batch.BatchNumber,
                    Quantity     = dto.Quantity,
                    TransferCode = code,
                    Status       = "Pending",
                    Remarks      = dto.Remarks,
                    RequestedBy  = requestedBy
                };

                _db.BranchTransfers.Add(transfer);
                await _db.SaveChangesAsync(ct);

                return (true, CreatedAtAction(nameof(GetTransfers), new { transfer.TransferId, transfer.TransferCode }));
            });
        }

        // ── PATCH /api/branches/transfer/{id}/approve ─────────────────────────
        // Admin/SystemAdmin ট্রান্সফার Approve করবে — Stock এখানেই move হয় ও FEFO ReceivedAt সংরক্ষিত থাকে
        [HttpPatch("transfer/{id:int}/approve")]
        [Authorize(Roles = "SystemAdmin,Admin")]
        [ModulePermission("BranchTransfer", "edit")]
        public async Task<IActionResult> ApproveTransfer(int id)
        {
            if (!HasValidCallerScope()) return Unauthorized();
            if (!_ctx.IsSystemAdmin && !_ctx.CanAccessAllBranches)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "শুধুমাত্র Tenant Admin বা SystemAdmin ট্রান্সফার অনুমোদন করতে পারবেন।" });

            return await _db.ExecuteInTransactionAsync<IActionResult>(async ct =>
            {
                var transfer = await FindScopedTransferAsync(id, ct);
                if (transfer == null) return (false, NotFound());

                if (transfer.Status != "Pending")
                    return (false, BadRequest($"এই ট্রান্সফার ইতিমধ্যে {transfer.Status} অবস্থায় আছে।"));

                var sourceBatch = await _db.MedicineBatches
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(b =>
                        b.BatchId  == transfer.BatchId &&
                        b.BranchId == transfer.FromBranchId &&
                        b.TenantId == transfer.TenantId, ct);

                if (sourceBatch == null)
                    return (false, BadRequest("Source batch পাওয়া যায়নি।"));

                if (!string.Equals(sourceBatch.Status, "Active", StringComparison.OrdinalIgnoreCase))
                    return (false, BadRequest($"Source batch বর্তমানে {sourceBatch.Status} অবস্থায় আছে; ট্রান্সফার করা যাবে না।"));

                if (sourceBatch.CurrentStock < transfer.Quantity)
                    return (false, BadRequest($"পর্যাপ্ত স্টক নেই। পাওয়া গেছে: {sourceBatch.CurrentStock} পিস।"));

                var destBranch = await _db.Branches
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(b => b.BranchId == transfer.ToBranchId && b.TenantId == transfer.TenantId, ct);
                if (destBranch != null && !destBranch.IsActive)
                    return (false, BadRequest("Destination শাখা নিষ্ক্রিয়।"));

                sourceBatch.CurrentStock -= transfer.Quantity;

                var destBatch = await _db.MedicineBatches
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(b =>
                        b.BatchNumber == sourceBatch.BatchNumber &&
                        b.MedicineId  == sourceBatch.MedicineId &&
                        b.BranchId    == transfer.ToBranchId &&
                        b.TenantId    == transfer.TenantId, ct);

                if (destBatch == null)
                {
                    destBatch = new MedicineBatch
                    {
                        TenantId         = transfer.TenantId,
                        BranchId         = transfer.ToBranchId,
                        MedicineId       = sourceBatch.MedicineId,
                        BatchNumber      = sourceBatch.BatchNumber,
                        ExpiryDate       = sourceBatch.ExpiryDate,
                        CurrentStock     = 0,
                        PurchasePrice    = sourceBatch.PurchasePrice,
                        SalePrice        = sourceBatch.SalePrice,
                        Status           = "Active",
                        ReceivedAt       = sourceBatch.ReceivedAt,
                        PurchaseDetailId = sourceBatch.PurchaseDetailId,
                        CreatedBy        = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name
                    };
                    _db.MedicineBatches.Add(destBatch);
                }

                destBatch.CurrentStock += transfer.Quantity;

                transfer.Status     = "Completed";
                transfer.ApprovedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
                transfer.ApprovedAt = BdNow();

                await _db.SaveChangesAsync(ct);
                return (true, Ok(new { message = "ট্রান্সফার সম্পন্ন হয়েছে।", transfer.TransferCode }));
            });
        }

        // ── PATCH /api/branches/transfer/{id}/reject ──────────────────────────
        // Admin/SystemAdmin Pending ট্রান্সফার প্রত্যাখ্যান করবে (কোনো স্টক পরিবর্তিত হয় না)
        [HttpPatch("transfer/{id:int}/reject")]
        [Authorize(Roles = "SystemAdmin,Admin")]
        [ModulePermission("BranchTransfer", "edit")]
        public async Task<IActionResult> RejectTransfer(
            int id,
            [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RejectTransferDto? dto = null)
        {
            if (!HasValidCallerScope()) return Unauthorized();
            if (!_ctx.IsSystemAdmin && !_ctx.CanAccessAllBranches)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "শুধুমাত্র Tenant Admin বা SystemAdmin ট্রান্সফার প্রত্যাখ্যান করতে পারবেন।" });

            return await _db.ExecuteInTransactionAsync<IActionResult>(async ct =>
            {
                var transfer = await FindScopedTransferAsync(id, ct);
                if (transfer == null) return (false, NotFound());

                if (transfer.Status != "Pending")
                    return (false, BadRequest($"এই ট্রান্সফার ইতিমধ্যে {transfer.Status} অবস্থায় আছে।"));

                transfer.Status     = "Rejected";
                transfer.ApprovedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
                transfer.ApprovedAt = BdNow();
                if (!string.IsNullOrWhiteSpace(dto?.Remarks))
                    transfer.Remarks = dto.Remarks.Trim();

                await _db.SaveChangesAsync(ct);
                return (true, Ok(new { message = "ট্রান্সফার প্রত্যাখ্যান করা হয়েছে।", transfer.TransferCode, transfer.Status }));
            });
        }

        // ── GET /api/branches/transfer ────────────────────────────────────────
        [HttpGet("transfer")]
        [ModulePermission("BranchTransfer", "view")]
        public async Task<IActionResult> GetTransfers([FromQuery] int? tenantId = null)
        {
            if (!HasValidCallerScope()) return Unauthorized();

            IQueryable<BranchTransfer> query = _ctx.IsSystemAdmin
                ? _db.BranchTransfers.IgnoreQueryFilters().AsNoTracking()
                : _db.BranchTransfers.IgnoreQueryFilters().AsNoTracking()
                    .Where(t => t.TenantId == _ctx.TenantId!.Value);

            if (_ctx.IsSystemAdmin && tenantId.HasValue)
                query = query.Where(t => t.TenantId == tenantId.Value);

            // Branch-restricted staff only see transfers involving their assigned branch
            if (!_ctx.IsSystemAdmin && _ctx.BranchId.HasValue)
            {
                int callerBranchId = _ctx.BranchId.Value;
                query = query.Where(t => t.FromBranchId == callerBranchId || t.ToBranchId == callerBranchId);
            }

            var branchNames = await ScopedBranchesQuery()
                .AsNoTracking()
                .Select(b => new { b.BranchId, b.BranchName })
                .ToDictionaryAsync(b => b.BranchId, b => b.BranchName);

            var rawTransfers = await query
                .OrderByDescending(t => t.TransferDate)
                .Select(t => new
                {
                    t.TransferId,
                    t.TenantId,
                    t.TransferCode,
                    t.FromBranchId,
                    t.ToBranchId,
                    t.BatchId,
                    t.BatchNumber,
                    t.MedicineId,
                    MedicineName = t.Medicine != null ? t.Medicine.Name : "",
                    t.Quantity,
                    t.Status,
                    t.TransferDate,
                    t.RequestedBy,
                    t.ApprovedBy,
                    t.ApprovedAt,
                    t.Remarks
                })
                .ToListAsync();

            var transfers = rawTransfers.Select(t => new
            {
                t.TransferId,
                t.TenantId,
                t.TransferCode,
                t.FromBranchId,
                FromBranchName = branchNames.TryGetValue(t.FromBranchId, out var fn) ? fn : "",
                t.ToBranchId,
                ToBranchName = branchNames.TryGetValue(t.ToBranchId, out var tn) ? tn : "",
                t.BatchId,
                t.BatchNumber,
                t.MedicineId,
                t.MedicineName,
                t.Quantity,
                t.Status,
                t.TransferDate,
                t.RequestedBy,
                t.ApprovedBy,
                t.ApprovedAt,
                t.Remarks
            });

            return Ok(transfers);
        }
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────
    public class CreateBranchDto
    {
        public int? TenantId { get; set; }  // SystemAdmin দেবে; Tenant Admin-এর ক্ষেত্রে context থেকে নেওয়া হয়
        [Required] public string BranchName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? DrugLicenseNo { get; set; }
        public bool IsHeadOffice { get; set; } = false;
    }

    public class UpdateBranchDto
    {
        public string? BranchName { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? DrugLicenseNo { get; set; }
    }

    public class BranchTransferRequestDto
    {
        [Required] public int FromBranchId { get; set; }
        [Required] public int ToBranchId   { get; set; }
        [Required] public int BatchId      { get; set; }
        [Range(1, int.MaxValue)] public int Quantity { get; set; }
        public string? Remarks { get; set; }
    }

    public class RejectTransferDto
    {
        [StringLength(500)]
        public string? Remarks { get; set; }
    }
}
