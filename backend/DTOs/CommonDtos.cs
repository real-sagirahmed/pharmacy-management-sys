namespace PharmacyApi.DTOs
{
    public class MedicineDto
    {
        public int MedicineId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string GenericName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class SupplierDto
    {
        public int SupplierId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ContactPerson { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class PurchaseMasterDto
    {
        public int PurchaseId { get; set; }
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime PurchaseDate { get; set; }
        public decimal TotalAmount { get; set; }
        public List<PurchaseDetailDto> PurchaseDetails { get; set; } = new();
    }

    public class PurchaseDetailDto
    {
        public int PurchaseDetailId { get; set; }
        public int MedicineId { get; set; }
        public string? MedicineName { get; set; }
        public string BatchNumber { get; set; } = string.Empty;
        public DateTime? ExpiryDate { get; set; }
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal Subtotal { get; set; }
    }

    public class SalesMasterDto
    {
        public int SaleId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public DateTime SaleDate { get; set; }
        public decimal GrandTotal { get; set; }
        public decimal Discount { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public List<SalesDetailDto> SalesDetails { get; set; } = new();
    }

    public class SalesDetailDto
    {
        public int SalesDetailId { get; set; }
        public int MedicineId { get; set; }
        public string? MedicineName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Tax { get; set; }
        public decimal Subtotal { get; set; }
    }
}
