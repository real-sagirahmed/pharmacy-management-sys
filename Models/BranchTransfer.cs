using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyApi.Models
{
    // ইন্টার-ব্রাঞ্চ স্টক ট্রান্সফার — একই Tenant-এর দুই Branch-এর মধ্যে।
    // ARCHITECTURAL INTENT: Cross-Tenant Transfer সম্পূর্ণ নিষিদ্ধ।
    // FromBranchId ও ToBranchId অবশ্যই একই TenantId-এর হতে হবে।
    // Backend validation এই invariant enforce করবে — frontend trust করা যাবে না।
    // Status flow: Pending → Approved → Completed | Rejected
    // শুধু Tenant Admin বা SystemAdmin Approve করতে পারবে।
    public class BranchTransfer
    {
        [Key]
        public int TransferId { get; set; }

        [Required]
        public int TenantId { get; set; }

        [Required]
        public int FromBranchId { get; set; }

        [Required]
        public int ToBranchId { get; set; }

        [Required]
        public int MedicineId { get; set; }

        [ForeignKey("MedicineId")]
        public virtual Medicine? Medicine { get; set; }

        // কোন batch থেকে transfer হচ্ছে (FIFO সংরক্ষণ করতে)
        public int? BatchId { get; set; }

        [StringLength(50)]
        public string BatchNumber { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
        public int Quantity { get; set; }

        // Auto-generated: TRF-YYYYMMDD-XXXXX format
        [StringLength(30)]
        public string TransferCode { get; set; } = string.Empty;

        // Pending | Approved | Completed | Rejected
        [StringLength(20)]
        public string Status { get; set; } = "Pending";

        [StringLength(500)]
        public string? Remarks { get; set; }

        public DateTime TransferDate { get; set; }

        [StringLength(100)]
        public string? RequestedBy { get; set; }

        [StringLength(100)]
        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public BranchTransfer()
        {
            TransferDate = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
        }
    }
}
