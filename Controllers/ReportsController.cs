using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Repositories;
using System;
using System.Threading.Tasks;

namespace PharmacyApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Protected by default, granular checks if needed
    public class ReportsController : ControllerBase
    {
        private readonly IReportRepository _reportRepository;

        public ReportsController(IReportRepository reportRepository)
        {
            _reportRepository = reportRepository;
        }

        [HttpGet("sales-summary")]
        public async Task<IActionResult> GetSalesSummary([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            var data = await _reportRepository.GetSalesSummaryAsync(startDate, endDate);
            return Ok(data);
        }

        [HttpGet("stock-status")]
        public async Task<IActionResult> GetStockStatus()
        {
            var data = await _reportRepository.GetStockStatusAsync();
            return Ok(data);
        }

        [HttpGet("profit-loss")]
        public async Task<IActionResult> GetProfitLoss([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            var data = await _reportRepository.GetProfitLossAsync(startDate, endDate);
            return Ok(data);
        }

        [HttpGet("purchase-summary")]
        public async Task<IActionResult> GetPurchaseSummary([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            var data = await _reportRepository.GetPurchaseSummaryAsync(startDate, endDate);
            return Ok(data);
        }
        [HttpGet("expiry")]
        public async Task<IActionResult> GetExpiryReport([FromQuery] int months = 6)
        {
            var data = await _reportRepository.GetExpiryReportAsync(months);
            return Ok(data);
        }

        [HttpGet("top-selling")]
        public async Task<IActionResult> GetTopSellingMedicines([FromQuery] DateTime startDate, [FromQuery] DateTime endDate, [FromQuery] int count = 10)
        {
            var data = await _reportRepository.GetTopSellingMedicinesAsync(startDate, endDate, count);
            return Ok(data);
        }

        [HttpGet("low-stock")]
        public async Task<IActionResult> GetLowStockReport()
        {
            var data = await _reportRepository.GetLowStockReportAsync();
            return Ok(data);
        }

        [HttpGet("ledger")]
        public async Task<IActionResult> GetLedgerReport([FromQuery] int partyId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            if (partyId <= 0) return BadRequest("Valid Party ID is required.");
            var data = await _reportRepository.GetLedgerReportAsync(partyId, startDate, endDate);
            return Ok(data);
        }

        [HttpGet("user-performance")]
        public async Task<IActionResult> GetUserPerformance([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            var data = await _reportRepository.GetUserPerformanceReportAsync(startDate, endDate);
            return Ok(data);
        }

        [HttpGet("vat-report")]
        public async Task<IActionResult> GetVatReport([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            var data = await _reportRepository.GetTaxReportAsync(startDate, endDate);
            return Ok(data);
        }
    }
}
