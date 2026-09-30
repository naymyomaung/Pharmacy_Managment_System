namespace PharmacyManagemntWebApi.Queries
{
    public class UnitQuery
    {

        public string GetAllUnitsQuery = @"SELECT [UnitId]
                                                 ,[UnitName]
                                                 ,[UnitCode]
                                                 ,[CreatedAt]
                                                 ,[UpdatedAt]
                                                 ,[DeletedAt]
                                                 ,[IsDeleted]
                                                  FROM [dbo].[Units] WHERE IsDeleted = 0";

        public string GetByIdQuery => @"
                                        SELECT [UnitId]
                                               ,[UnitName]
                                               ,[UnitCode]
                                               ,[CreatedAt]
                                               ,[UpdatedAt]
                                               ,[DeletedAt]
                                               ,[IsDeleted]
                                                FROM [dbo].[Units] 
                                                WHERE IsDeleted = 0 AND [UnitId] = @UnitId";

        public string InsertQuery => @"INSERT INTO dbo.Units (UnitName, UnitCode, CreatedAt, IsDeleted)
                                       OUTPUT INSERTED.UnitId VALUES (@UnitName, @UnitCode, GETDATE(), 0);";

        public string UpdateQuery => @"UPDATE dbo.Units SET UnitName=@UnitName, UnitCode=@UnitCode, UpdatedAt=GETDATE()
                                       WHERE UnitId=@UnitId AND IsDeleted=0;";

        public string SoftDeleteQuery => @"UPDATE dbo.Units SET IsDeleted=1, DeletedAt=GETDATE() WHERE UnitId=@UnitId;";
    }
}