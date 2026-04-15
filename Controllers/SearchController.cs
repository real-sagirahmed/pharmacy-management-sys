using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.DTOs;
using PharmacyApi.Services;
using System.Security.Claims;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        private readonly IGlobalSearchService _searchService;

        public SearchController(IGlobalSearchService searchService)
        {
            _searchService = searchService;
        }

        // Using HttpPost makes it cleaner to send complex objects (Dates, Arrays/Lists) from Angular
        [HttpPost]
        public async Task<ActionResult<List<SearchResultDto>>> Search([FromBody] SearchRequestDto request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(); // Security Fallback
            }

            try
            {
                var results = await _searchService.SearchAsync(request, userId);
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
