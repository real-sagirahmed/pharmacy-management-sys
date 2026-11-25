using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyApi.Models
{
    // ARCHITECTURAL INTENT: Branch = একটি Tenant-এর শারীরিক শাখা।
    // BranchId দিয়ে শাখা-স্তরে Stock, Sales, Purchase আলাদা থাকে।
    // Medicine Catalog Tenant-level shared — Branch.cs-এ Medicine DbSet নেই।
    // IsHeadOffice = true Branch শুধু Admin দেখবে এবং Cross-branch report টানবে।
    // Cross-Tenant ডেটা অ্যাক্সেস সম্পূর্ণ নিষিদ্ধ — backend সর্বদা enforce করবে।
    public class Branch
    {
        [Key]
        public int BranchId { get; set; }

        [Required]
        public int TenantId { get; set; }

        [ForeignKey("TenantId")]
        public virtual Tenant? Tenant { get; set; }

        [Required]
        [StringLength(100)]
        public string BranchName { get; set; } = string.Empty;  // "গুলশান শাখা"

        [StringLength(300)]
        public string? Address { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        // শাখার নিজস্ব DGDA লাইসেন্স (যদি আলাদা থাকে, না থাকলে Tenant-এর লাইসেন্স প্রিন্ট হবে)
        [StringLength(50)]
        public string? DrugLicenseNo { get; set; }

        public bool IsHeadOffice { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }

        public Branch()
        {
            CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
        }
    }
}
