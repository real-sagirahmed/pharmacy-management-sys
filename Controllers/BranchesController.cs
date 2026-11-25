using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.Models;
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

        // ── GET /api/branches ─────────────────────────────────────────────────
        // Tenant Admin → নিজের সব Branch
        // SystemAdmin  → query param tenantId দিয়ে ফিল্টার করতে পারবে
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? tenantId)
        {
            IQueryable<Branch> query = _ctx.IsSystemAdmin
                ? _db.Branches.IgnoreQueryFilters()
                : _db.Branches;

            if (_ctx.IsSystemAdmin && tenantId.HasValue)
                query = query.Where(b => b.TenantId == tenantId);

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
        // Tenant Admin বা SystemAdmin নতুন শাখা যুক্ত করতে পারবে
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBranchDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // TenantId নির্ধারণ: SystemAdmin dto থেকে নেবে, Admin নিজের TenantId ব্যবহার করবে
            var targetTenantId = _ctx.IsSystemAdmin ? dto.TenantId : _ctx.TenantId;
            if (targetTenantId == null)
                return BadRequest("TenantId প্রয়োজন।");

            // Tenant আছে কিনা যাচাই
            var tenantExists = await _db.Tenants.IgnoreQueryFilters()
                .AnyAsync(t => t.TenantId == targetTenantId && t.IsActive);
            if (!tenantExists) return NotFound("Tenant পাওয়া যায়নি।");

            var branch = new Branch
            {
                TenantId     = targetTenantId.Value,
                BranchName   = dto.BranchName,
                Address      = dto.Address,
                Phone        = dto.Phone,
                DrugLicenseNo= dto.DrugLicenseNo,
                IsHeadOffice = dto.IsHeadOffice,
                IsActive     = true
            };

            _db.Branches.Add(branch);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { branch.BranchId });
        }

        // ── PUT /api/branches/{id} ────────────────────────────────────────────
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateBranchDto dto)
        {
            var branch = _ctx.IsSystemAdmin
                ? await _db.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.BranchId == id)
                : await _db.Branches.FirstOrDefaultAsync(b => b.BranchId == id);

            if (branch == null) return NotFound();

            branch.BranchName    = dto.BranchName    ?? branch.BranchName;
            branch.Address       = dto.Address        ?? branch.Address;
            branch.Phone         = dto.Phone          ?? branch.Phone;
            branch.DrugLicenseNo = dto.DrugLicenseNo  ?? branch.DrugLicenseNo;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── PATCH /api/branches/{id}/status ──────────────────────────────────
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> SetStatus(int id, [FromBody] bool isActive)
        {
            var branch = _ctx.IsSystemAdmin
                ? await _db.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.BranchId == id)
                : await _db.Branches.FirstOrDefaultAsync(b => b.BranchId == id && !b.IsHeadOffice);

            if (branch == null) return NotFound();
            branch.IsActive = isActive;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── POST /api/branches/transfer ───────────────────────────────────────
        // ইন্টার-ব্রাঞ্চ স্টক ট্রান্সফার রিকোয়েস্ট (Pending state-এ তৈরি হয়)
        [HttpPost("transfer")]
        public async Task<IActionResult> RequestTransfer([FromBody] BranchTransferRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (_ctx.TenantId == null) return Unauthorized();

            // Cross-Tenant transfer নিষিদ্ধ
            var fromBranch = await _db.Branches
                .FirstOrDefaultAsync(b => b.BranchId == dto.FromBranchId && b.IsActive);
            var toBranch = await _db.Branches
                .FirstOrDefaultAsync(b => b.BranchId == dto.ToBranchId && b.IsActive);

            if (fromBranch == null || toBranch == null)
                return BadRequest("একটি বা উভয় শাখা পাওয়া যায়নি।");

            if (fromBranch.TenantId != toBranch.TenantId)
                return BadRequest("দুটি ভিন্ন Tenant-এর শাখার মধ্যে ট্রান্সফার নিষিদ্ধ।");

            if (dto.FromBranchId == dto.ToBranchId)
                return BadRequest("একই শাখায় ট্রান্সফার করা যাবে না।");

            // Source batch-এ পর্যাপ্ত স্টক আছে কিনা যাচাই
            var batch = await _db.MedicineBatches
                .FirstOrDefaultAsync(b =>
                    b.BatchId   == dto.BatchId   &&
                    b.BranchId  == dto.FromBranchId &&
                    b.TenantId  == _ctx.TenantId &&
                    b.Status    == "Active");

            if (batch == null)
                return BadRequest("ব্যাচ পাওয়া যায়নি বা Active নয়।");

            if (batch.CurrentStock < dto.Quantity)
                return BadRequest($"পর্যাপ্ত স্টক নেই। পাওয়া গেছে: {batch.CurrentStock} পিস।");

            // TransferCode generate
            var bd       = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
                           TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
            var lastCode = await _db.BranchTransfers.IgnoreQueryFilters()
                .Where(t => t.TenantId == _ctx.TenantId)
                .CountAsync();
            var code = $"TRF-{bd:yyyyMMdd}-{(lastCode + 1):D5}";

            var requestedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

            var transfer = new BranchTransfer
            {
                TenantId      = _ctx.TenantId.Value,
                FromBranchId  = dto.FromBranchId,
                ToBranchId    = dto.ToBranchId,
                MedicineId    = batch.MedicineId,
                BatchId       = dto.BatchId,
                BatchNumber   = batch.BatchNumber,
                Quantity      = dto.Quantity,
                TransferCode  = code,
                Status        = "Pending",
                Remarks       = dto.Remarks,
                RequestedBy   = requestedBy
            };

            _db.BranchTransfers.Add(transfer);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTransfers), new { transfer.TransferId, transfer.TransferCode });
        }

        // ── PATCH /api/branches/transfer/{id}/approve ─────────────────────────
        // Admin/SystemAdmin ট্রান্সফার Approve করবে — Stock আসলে এখানেই move হয়
        [HttpPatch("transfer/{id:int}/approve")]
        [Authorize(Roles = "SystemAdmin,Admin")]
        public async Task<IActionResult> ApproveTransfer(int id)
        {
            var transfer = _ctx.IsSystemAdmin
                ? await _db.BranchTransfers.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TransferId == id)
                : await _db.BranchTransfers.FirstOrDefaultAsync(t => t.TransferId == id && t.Status == "Pending");

            if (transfer == null) return NotFound();
            if (transfer.Status != "Pending")
                return BadRequest($"এই ট্রান্সফার ইতিমধ্যে {transfer.Status} অবস্থায় আছে।");

            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                // Source batch থেকে stock কমানো
                var sourceBatch = await _db.MedicineBatches
                    .FirstOrDefaultAsync(b =>
                        b.BatchId  == transfer.BatchId &&
                        b.BranchId == transfer.FromBranchId &&
                        b.TenantId == transfer.TenantId);

                if (sourceBatch == null)
                    return BadRequest("Source batch পাওয়া যায়নি।");

                if (sourceBatch.CurrentStock < transfer.Quantity)
                    return BadRequest($"পর্যাপ্ত স্টক নেই। পাওয়া গেছে: {sourceBatch.CurrentStock} পিস।");

                sourceBatch.CurrentStock -= transfer.Quantity;

                // Destination batch-এ stock বাড়ানো (একই BatchNumber, ভিন্ন Branch)
                var destBatch = await _db.MedicineBatches
                    .FirstOrDefaultAsync(b =>
                        b.BatchNumber == sourceBatch.BatchNumber &&
                        b.MedicineId  == sourceBatch.MedicineId &&
                        b.BranchId    == transfer.ToBranchId &&
                        b.TenantId    == transfer.TenantId);

                if (destBatch == null)
                {
                    // Destination-এ এই batch নেই — নতুন তৈরি করতে হবে
                    destBatch = new MedicineBatch
                    {
                        TenantId      = transfer.TenantId,
                        BranchId      = transfer.ToBranchId,
                        MedicineId    = sourceBatch.MedicineId,
                        BatchNumber   = sourceBatch.BatchNumber,
                        ExpiryDate    = sourceBatch.ExpiryDate,
                        CurrentStock  = 0,
                        PurchasePrice = sourceBatch.PurchasePrice,
                        SalePrice     = sourceBatch.SalePrice,
                        Status        = "Active",
                        CreatedBy     = User.FindFirst(ClaimTypes.Name)?.Value
                    };
                    _db.MedicineBatches.Add(destBatch);
                }

                destBatch.CurrentStock += transfer.Quantity;

                // Transfer status update
                transfer.Status    = "Completed";
                transfer.ApprovedBy= User.FindFirst(ClaimTypes.Name)?.Value;
                transfer.ApprovedAt= TimeZoneInfo.ConvertTimeFromUtc(
                    DateTime.UtcNow,
                    TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return Ok(new { message = "ট্রান্সফার সম্পন্ন হয়েছে।", transfer.TransferCode });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        // ── GET /api/branches/transfer ────────────────────────────────────────
        [HttpGet("transfer")]
        public async Task<IActionResult> GetTransfers()
        {
            var transfers = await _db.BranchTransfers
                .OrderByDescending(t => t.TransferDate)
                .Select(t => new
                {
                    t.TransferId,
                    t.TransferCode,
                    t.FromBranchId,
                    t.ToBranchId,
                    t.BatchNumber,
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
}
