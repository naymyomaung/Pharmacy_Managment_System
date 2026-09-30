namespace PharmacyManagemntWebApi.Models
{
    public class Sale
    {
        public int SaleId { get; set; }
        public int UserId { get; set; }
        public string CustomerName { get; set; } = "General Customer";
        public DateTime SaleDate { get; set; } = DateTime.Now;
        public decimal TotalAmount { get; set; }
        public decimal Discount { get; set; } = 0.00m;
        public decimal NetAmount { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public List<SaleItem> Items { get; set; } = new();
    }

    public class SaleItem
    {
        public int SaleItemId { get; set; }
        public int SaleId { get; set; }
        public int DrugId { get; set; }
        public int UnitId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal { get; set; }
    }
}
