using Microsoft.AspNetCore.Mvc;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Repository;

namespace PharmacyManagemntWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly UserRepo _repo;
        public UsersController(UserRepo repo) => _repo = repo;

        [HttpGet] public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());
        [HttpGet("{id}")] public async Task<IActionResult> GetById(int id)
        {
            var u = await _repo.GetByIdAsync(id);
            return u == null ? NotFound() : Ok(u);
        }
        [HttpPost] public async Task<IActionResult> Create(User m)
        {
            var id = await _repo.CreateAsync(m);
            return CreatedAtAction(nameof(GetById), new { id }, new { UserId = id });
        }
        [HttpPut("{id}")] public async Task<IActionResult> Update(int id, User m)
        {
            m.UserId = id;
            return await _repo.UpdateAsync(m) ? NoContent() : NotFound();
        }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id)
            => await _repo.DeleteAsync(id) ? NoContent() : NotFound();
    }
}
