using Microsoft.AspNetCore.Mvc;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Repository;

namespace PharmacyManagemntWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PurchasesController : ControllerBase
    {
        private readonly PurchaseRepo _repo;
        public PurchasesController(PurchaseRepo repo) => _repo = repo;

        [HttpGet] public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());
        [HttpGet("{id}")] public async Task<IActionResult> GetById(int id)
        {
            var p = await _repo.GetByIdWithItemsAsync(id);
            return p == null ? NotFound() : Ok(p);
        }
        [HttpPost] public async Task<IActionResult> Create(Purchase m)
        {
            try
            {
                var id = await _repo.CreateAsync(m);
                return CreatedAtAction(nameof(GetById), new { id }, new { PurchaseId = id });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id)
            => await _repo.DeleteAsync(id) ? NoContent() : NotFound();
    }
}
