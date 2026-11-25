using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyApi.Models
{
    // ARCHITECTURAL INTENT: MedicineBatch = একটি নির্দিষ্ট ব্যাচের শাখা-ভিত্তিক স্টক।
    // প্রতিটি Purchase Entry-তে সংশ্লিষ্ট Batch-এ CurrentStock বৃদ্ধি পাবে।
    // POS Sales-এ FIFO নীতিতে (ExpiryDate ascending) সবচেয়ে পুরানো ব্যাচ আগে কমবে।
    // Status: Active | Recalled | Quarantined
    //   - "Active" ছাড়া কোনো ব্যাচ POS বিলে যোগ করা যাবে না।
    //   - "Recalled" / "Quarantined" করতে পারবেন শুধু Admin বা SystemAdmin।
    //   - মেয়াদ শেষ হলে backend স্বয়ংক্রিয়ভাবে POS-এ ব্লক করবে।
    // TenantId + BranchId দিয়ে সম্পূর্ণ আইসোলেশন নিশ্চিত।
    public class MedicineBatch
    {
        [Key]
        public int BatchId { get; set; }

        [Required]
        public int TenantId { get; set; }

        [Required]
        public int BranchId { get; set; }  // কোন শাখার স্টক

        [Required]
        public int MedicineId { get; set; }

        [ForeignKey("MedicineId")]
        public virtual Medicine? Medicine { get; set; }

        [Required]
        [StringLength(50)]
        public string BatchNumber { get; set; } = string.Empty;

        public DateTime ExpiryDate { get; set; }

        [Range(0, int.MaxValue)]
        public int CurrentStock { get; set; }

        public decimal PurchasePrice { get; set; }

        public decimal SalePrice { get; set; }

        // Active | Recalled | Quarantined
        [StringLength(20)]
        public string Status { get; set; } = "Active";

        // পারচেজ এন্ট্রির সময় (FIFO তে পুরনো ব্যাচ আগে বিক্রির জন্য)
        public DateTime ReceivedAt { get; set; }

        // পারচেজ রেকর্ডের সাথে সংযোগ (traceability)
        public int? PurchaseDetailId { get; set; }

        // Audit
        public DateTime CreatedAt { get; set; }
        [StringLength(100)]
        public string? CreatedBy { get; set; }

        public MedicineBatch()
        {
            var bd = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
            ReceivedAt = bd;
            CreatedAt  = bd;
        }
    }
}
