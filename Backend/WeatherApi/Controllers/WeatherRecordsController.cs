using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WeatherApi.Data;
using WeatherApi.Dtos;
using WeatherApi.Models;

namespace WeatherApi.Controllers;

[ApiController]
[Route("api/weather-records")]
public class WeatherRecordsController : ControllerBase
{
    private readonly AppDBContext _context;
    public WeatherRecordsController(AppDBContext context) => _context = context;

    [HttpPost]
    public async Task<IActionResult> Save(SaveWeatherRecordDto dto)
    {
        TimeZoneInfo tz;
        try { tz = TimeZoneInfo.FindSystemTimeZoneById(dto.Timezone); }
        catch (TimeZoneNotFoundException) { return BadRequest(new { error = "Ukendt timezone" }); }

        var local = DateTime.SpecifyKind(dto.DataTime!.Value, DateTimeKind.Unspecified);
        if (tz.IsInvalidTime(local)) return BadRequest(new { error = "Ugyldigt tidspunkt" });

        var weatherRecord = new WeatherRecord
        {
            Id = Guid.NewGuid(),
            Api = dto.Api,
            City = dto.City,
            Temperature = dto.Temperature,
            TemperatureUnit = dto.TemperatureUnit,
            Humidity = dto.Humidity,
            HumidityUnit = dto.HumidityUnit,
            WindSpeed = dto.WindSpeed,
            WindSpeedUnit = dto.WindSpeedUnit,
            DataTime = TimeZoneInfo.ConvertTimeToUtc(local, tz),
            Timezone = dto.Timezone,
            SavedAt = DateTime.UtcNow
        };

        _context.WeatherRecords.Add(weatherRecord);
        await _context.SaveChangesAsync();
        return Created($"/api/weather-records/{weatherRecord.Id}", new { id = weatherRecord.Id, status = "saved" });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? city)
    {
        var query = _context.WeatherRecords.AsQueryable();
        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(r => r.City == city);

        return Ok(await query.OrderByDescending(r => r.SavedAt).ToListAsync());
    }
}