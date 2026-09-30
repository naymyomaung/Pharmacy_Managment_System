namespace PharmacyManagemntWebApi.Queries
{
    public class DrugQuery
    {
        public string GetAll => @"SELECT DrugId, DrugName, GenericName, Category, BaseUnitId, SellingPrice, StockQuantity, ExpiryDate, CreatedAt, IsDeleted FROM dbo.Drugs WHERE IsDeleted=0 ORDER BY DrugId DESC;";
        public string GetById => @"SELECT DrugId, DrugName, GenericName, Category, BaseUnitId, SellingPrice, StockQuantity, ExpiryDate, CreatedAt, IsDeleted FROM dbo.Drugs WHERE DrugId=@DrugId AND IsDeleted=0;";
        public string Insert => @"INSERT INTO dbo.Drugs (DrugName, GenericName, Category, BaseUnitId, SellingPrice, StockQuantity, ExpiryDate, CreatedAt, IsDeleted) OUTPUT INSERTED.DrugId VALUES (@DrugName,@GenericName,@Category,@BaseUnitId,@SellingPrice,@StockQuantity,@ExpiryDate,@CreatedAt,0);";
        public string Update => @"UPDATE dbo.Drugs SET DrugName=@DrugName, GenericName=@GenericName, Category=@Category, BaseUnitId=@BaseUnitId, SellingPrice=@SellingPrice, StockQuantity=@StockQuantity, ExpiryDate=@ExpiryDate WHERE DrugId=@DrugId;";
        public string SoftDelete => @"UPDATE dbo.Drugs SET IsDeleted=1 WHERE DrugId=@DrugId;";
        public string UpdateStock => @"UPDATE dbo.Drugs SET StockQuantity = StockQuantity + @QtyChange WHERE DrugId=@DrugId;";
        public string GetStock => @"SELECT StockQuantity FROM dbo.Drugs WHERE DrugId=@DrugId AND IsDeleted=0;";
    }
}
