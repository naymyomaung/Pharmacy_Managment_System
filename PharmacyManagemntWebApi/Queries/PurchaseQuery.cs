namespace PharmacyManagemntWebApi.Queries
{
    public class PurchaseQuery
    {
        public string GetAll => @"SELECT PurchaseId, SupplierId, UserId, PurchaseDate, TotalAmount, InvoiceNumber FROM dbo.Purchases ORDER BY PurchaseId DESC;";
        public string GetById => @"SELECT PurchaseId, SupplierId, UserId, PurchaseDate, TotalAmount, InvoiceNumber FROM dbo.Purchases WHERE PurchaseId=@PurchaseId;";
        public string Insert => @"INSERT INTO dbo.Purchases (SupplierId, UserId, PurchaseDate, TotalAmount, InvoiceNumber) OUTPUT INSERTED.PurchaseId VALUES (@SupplierId,@UserId,@PurchaseDate,@TotalAmount,@InvoiceNumber);";
        public string Delete => @"DELETE FROM dbo.Purchases WHERE PurchaseId=@PurchaseId;";
        public string GetItemsByPurchaseId => @"SELECT PurchaseItemId, PurchaseId, DrugId, UnitId, Quantity, UnitPrice, Subtotal, ExpiryDate FROM dbo.PurchaseItems WHERE PurchaseId=@PurchaseId;";
        public string InsertItem => @"INSERT INTO dbo.PurchaseItems (PurchaseId, DrugId, UnitId, Quantity, UnitPrice, ExpiryDate) OUTPUT INSERTED.PurchaseItemId VALUES (@PurchaseId,@DrugId,@UnitId,@Quantity,@UnitPrice,@ExpiryDate);";
        public string DeleteItemsByPurchaseId => @"DELETE FROM dbo.PurchaseItems WHERE PurchaseId=@PurchaseId;";
    }

    public class DrugBatchQuery
    {
        public string GetBatchesByDrugId => @"SELECT BatchId, DrugId, PurchaseItemId, ExpiryDate, Quantity, UnitId, CreatedAt FROM dbo.DrugBatches WHERE DrugId=@DrugId AND Quantity > 0 ORDER BY ExpiryDate ASC, CreatedAt ASC;";
        public string GetBatchById => @"SELECT BatchId, DrugId, PurchaseItemId, ExpiryDate, Quantity, UnitId, CreatedAt FROM dbo.DrugBatches WHERE BatchId=@BatchId;";
        public string InsertBatch => @"INSERT INTO dbo.DrugBatches (DrugId, PurchaseItemId, ExpiryDate, Quantity, UnitId, CreatedAt) OUTPUT INSERTED.BatchId VALUES (@DrugId,@PurchaseItemId,@ExpiryDate,@Quantity,@UnitId,@CreatedAt);";
        public string UpdateBatchQuantity => @"UPDATE dbo.DrugBatches SET Quantity = Quantity - @Qty WHERE BatchId=@BatchId;";
        public string DeleteEmptyBatches => @"DELETE FROM dbo.DrugBatches WHERE Quantity <= 0;";
    }
}
