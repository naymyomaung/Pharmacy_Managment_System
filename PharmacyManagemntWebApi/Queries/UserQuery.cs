namespace PharmacyManagemntWebApi.Queries
{
    public class UserQuery
    {
        public string GetAll => @"SELECT UserId, FullName, Username, PasswordHash, Role, CreatedAt FROM dbo.Users ORDER BY UserId DESC;";
        public string GetById => @"SELECT UserId, FullName, Username, PasswordHash, Role, CreatedAt FROM dbo.Users WHERE UserId = @UserId;";
        public string GetByUsername => @"SELECT UserId, FullName, Username, PasswordHash, Role, CreatedAt FROM dbo.Users WHERE Username = @Username;";
        public string Insert => @"INSERT INTO dbo.Users (FullName, Username, PasswordHash, Role, CreatedAt) OUTPUT INSERTED.UserId VALUES (@FullName, @Username, @PasswordHash, @Role, @CreatedAt);";
        public string Update => @"UPDATE dbo.Users SET FullName=@FullName, Username=@Username, PasswordHash=@PasswordHash, Role=@Role WHERE UserId=@UserId;";
        public string Delete => @"DELETE FROM dbo.Users WHERE UserId=@UserId;";
    }
}
