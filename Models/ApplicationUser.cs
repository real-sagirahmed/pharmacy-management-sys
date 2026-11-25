using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    public class ApplicationUser : IdentityUser
    {
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Address { get; set; }

        public string? ProfilePicturePath { get; set; }

        public bool IsActive { get; set; } = true;

        // ─── SaaS: Multi-Tenant, Multi-Branch Identity ───────────────────────
        // ARCHITECTURAL INTENT (Access Hierarchy — NEVER revert this):
        //   TenantId = null, BranchId = null → SystemAdmin (সব Tenant, সব Branch)
        //   TenantId ≠ null, BranchId = null → Tenant Owner/Admin (নিজের সব Branch দেখে)
        //   TenantId ≠ null, BranchId ≠ null → Branch Manager/Cashier (শুধু নির্দিষ্ট Branch)
        //
        // এই তিনটি কম্বিনেশনই পুরো access matrix ডিফাইন করে।
        // BranchId ছাড়া TenantId null হওয়া invalid state — seeding/registration-এ এটি enforce করতে হবে।
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
    }
}
