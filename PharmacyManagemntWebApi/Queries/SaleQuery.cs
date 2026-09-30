namespace PharmacyManagemntWebApi.Queries
{
    public class SaleQuery
    {
        public string GetAll => @"SELECT SaleId, UserId, CustomerName, SaleDate, TotalAmount, Discount, NetAmount, PaymentMethod FROM dbo.Sales ORDER BY SaleId DESC;";
        public string GetById => @"SELECT SaleId, UserId, CustomerName, SaleDate, TotalAmount, Discount, NetAmount, PaymentMethod FROM dbo.Sales WHERE SaleId=@SaleId;";
        public string Insert => @"INSERT INTO dbo.Sales (UserId, CustomerName, SaleDate, TotalAmount, Discount, PaymentMethod) OUTPUT INSERTED.SaleId VALUES (@UserId,@CustomerName,@SaleDate,@TotalAmount,@Discount,@PaymentMethod);";
        public string Delete => @"DELETE FROM dbo.Sales WHERE SaleId=@SaleId;";
        public string GetItemsBySaleId => @"SELECT SaleItemId, SaleId, DrugId, UnitId, Quantity, UnitPrice, Subtotal FROM dbo.SaleItems WHERE SaleId=@SaleId;";
        public string InsertItem => @"INSERT INTO dbo.SaleItems (SaleId, DrugId, UnitId, Quantity, UnitPrice) VALUES (@SaleId,@DrugId,@UnitId,@Quantity,@UnitPrice);";
        public string DeleteItemsBySaleId => @"DELETE FROM dbo.SaleItems WHERE SaleId=@SaleId;";
    }
}
