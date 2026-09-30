using Dapper;
using PharmacyManagemntWebApi.Data;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Queries;

namespace PharmacyManagemntWebApi.Repository
{
    public class UserRepo
    {
        private readonly IDbConnectionFactory _conn;
        private readonly UserQuery _q = new();
        public UserRepo(IDbConnectionFactory conn) => _conn = conn;

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            using var c = _conn.CreateConnection();
            return await c.QueryAsync<User>(_q.GetAll);
        }
        public async Task<User?> GetByIdAsync(int id)
        {
            using var c = _conn.CreateConnection();
            return await c.QueryFirstOrDefaultAsync<User>(_q.GetById, new { UserId = id });
        }
        public async Task<User?> GetByUsernameAsync(string username)
        {
            using var c = _conn.CreateConnection();
            return await c.QueryFirstOrDefaultAsync<User>(_q.GetByUsername, new { Username = username });
        }
        public async Task<int> CreateAsync(User m)
        {
            using var c = _conn.CreateConnection();
            m.CreatedAt = DateTime.Now;
            return await c.ExecuteScalarAsync<int>(_q.Insert, m);
        }
        public async Task<bool> UpdateAsync(User m)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteAsync(_q.Update, m) > 0;
        }
        public async Task<bool> DeleteAsync(int id)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteAsync(_q.Delete, new { UserId = id }) > 0;
        }
    }
}
