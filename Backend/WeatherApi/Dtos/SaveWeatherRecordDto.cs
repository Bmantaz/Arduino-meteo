using System.ComponentModel.DataAnnotations;

namespace WeatherApi.Dtos;

public class SaveWeatherRecordDto
{
    [Required, StringLength(50)] public string Api { get; set; } = "";
    [Required, StringLength(100)] public string City { get; set; } = "";
    public double Temperature { get; set; }
    [Required, StringLength(10)] public string TemperatureUnit { get; set; } = "";
    [Range(0, 100)] public int Humidity { get; set; }
    [Required, StringLength(10)] public string HumidityUnit { get; set; } = "";
    [Range(0, 500)] public double WindSpeed { get; set; }
    [Required, StringLength(10)] public string WindSpeedUnit { get; set; } = "";
    [Required] public DateTime? DataTime { get; set; }
    [Required, StringLength(64)] public string Timezone { get; set; } = "";
}