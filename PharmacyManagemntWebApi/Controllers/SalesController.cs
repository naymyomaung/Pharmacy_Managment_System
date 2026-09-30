using Microsoft.AspNetCore.Mvc;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Repository;

namespace PharmacyManagemntWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SalesController : ControllerBase
    {
        private readonly SaleRepo _repo;
        public SalesController(SaleRepo repo) => _repo = repo;

        [HttpGet] public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());
        [HttpGet("{id}")] public async Task<IActionResult> GetById(int id)
        {
            var s = await _repo.GetByIdWithItemsAsync(id);
            return s == null ? NotFound() : Ok(s);
        }
        [HttpPost] public async Task<IActionResult> Create(Sale m)
        {
            try
            {
                var id = await _repo.CreateAsync(m);
                return CreatedAtAction(nameof(GetById), new { id }, new { SaleId = id });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id)
            => await _repo.DeleteAsync(id) ? NoContent() : NotFound();
    }
}
