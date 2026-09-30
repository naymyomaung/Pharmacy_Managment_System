using Dapper;
using PharmacyManagemntWebApi.Data;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Queries;

namespace PharmacyManagemntWebApi.Repository
{
    public class DrugConversionRepo
    {
        private readonly IDbConnectionFactory _conn;
        private readonly DrugConversionQuery _q = new();
        public DrugConversionRepo(IDbConnectionFactory conn) => _conn = conn;

        public async Task<IEnumerable<DrugConversion>> GetAllAsync()
        {
            using var c = _conn.CreateConnection();
            return await c.QueryAsync<DrugConversion>(_q.GetAll);
        }
        public async Task<DrugConversion?> GetByIdAsync(int id)
        {
            using var c = _conn.CreateConnection();
            return await c.QueryFirstOrDefaultAsync<DrugConversion>(_q.GetById, new { ConversionId = id });
        }
        public async Task<IEnumerable<DrugConversion>> GetByDrugIdAsync(int drugId)
        {
            using var c = _conn.CreateConnection();
            return await c.QueryAsync<DrugConversion>(_q.GetByDrugId, new { DrugId = drugId });
        }
        public async Task<int> CreateAsync(DrugConversion m)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteScalarAsync<int>(_q.Insert, m);
        }
        public async Task<bool> UpdateAsync(DrugConversion m)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteAsync(_q.Update, m) > 0;
        }
        public async Task<bool> DeleteAsync(int id)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteAsync(_q.Delete, new { ConversionId = id }) > 0;
        }
    }
}
