namespace PharmacyManagemntWebApi.Models
{
    public class Purchase
    {
        public int PurchaseId { get; set; }
        public int? SupplierId { get; set; }
        public int UserId { get; set; }
        public DateTime PurchaseDate { get; set; } = DateTime.Now;
        public decimal TotalAmount { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public List<PurchaseItem> Items { get; set; } = new();
    }

    public class PurchaseItem
    {
        public int PurchaseItemId { get; set; }
        public int PurchaseId { get; set; }
        public int DrugId { get; set; }
        public int UnitId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal { get; set; }
        public DateTime? ExpiryDate { get; set; }
    }

    // For FEFO inventory tracking - tracks stock by batch/lot with expiry date
    public class DrugBatch
    {
        public int BatchId { get; set; }
        public int DrugId { get; set; }
        public int PurchaseItemId { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public int Quantity { get; set; } // Current remaining quantity in base unit
        public int UnitId { get; set; } // Unit of the quantity
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }

    // For FEFO sale processing - represents stock deduction from a specific batch
    public class SaleBatchDeduction
    {
        public int BatchId { get; set; }
        public int Quantity { get; set; } // Quantity to deduct in base unit
    }
}
