using Dapper;
using Microsoft.Data.SqlClient;
using PharmacyManagemntWebApi.Data;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Queries;
using System.Collections;
using System.Data;

namespace PharmacyManagemntWebApi.Repository
{
    public class UnitRepo
    {
        private readonly IDbConnectionFactory _conn;

        public UnitRepo(IDbConnectionFactory conn)
        {
            _conn = conn;
        }

        
        // Get All Unit 

        public async Task<IEnumerable<UnitModles>> GellAllUnits()
        {
            using( var connection = _conn.CreateConnection())
            {
                var query = new UnitQuery();
                var units = await connection.QueryAsync<UnitModles>(query.GetAllUnitsQuery);

                return units;
            }
        }

        // Get By Unit ID

        public async Task<UnitModles?> GetByUnitID(int id)
        {
            using (var connection = _conn.CreateConnection())
            {
                var query = new UnitQuery();
                var unit = await connection.QueryFirstOrDefaultAsync<UnitModles>(query.GetByIdQuery, new { UnitId = id });
                return unit;
            }
        }

        // Create Unit
        public async Task<int> CreateUnit(UnitModles m)
        {
            using (var connection = _conn.CreateConnection())
            {
                var query = new UnitQuery();
                return await connection.ExecuteScalarAsync<int>(query.InsertQuery, m);
            }
        }

        // Update Unit
        public async Task<bool> UpdateUnit(UnitModles m)
        {
            using (var connection = _conn.CreateConnection())
            {
                var query = new UnitQuery();
                return await connection.ExecuteAsync(query.UpdateQuery, m) > 0;
            }
        }

        // Soft Delete
        public async Task<bool> SoftDeleteUnit(int id)
        {
            using (var connection = _conn.CreateConnection())
            {
                var query = new UnitQuery();
                return await connection.ExecuteAsync(query.SoftDeleteQuery, new { UnitId = id }) > 0;
            }
        }
    }
}
