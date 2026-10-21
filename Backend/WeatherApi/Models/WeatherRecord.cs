namespace WeatherApi.Models;

public class WeatherRecord
{
    public Guid Id { get; set; }
    public required string Api { get; set; }
    public required string City { get; set; }
    public double Temperature { get; set; }
    public required string TemperatureUnit { get; set; }
    public int Humidity { get; set; }
    public required string HumidityUnit { get; set; }
    public double WindSpeed { get; set; }
    public required string WindSpeedUnit { get; set; }
    public DateTime DataTime { get; set; }        // gemmes som UTC
    public required string Timezone { get; set; } // oprindelig tidszone, fx Europe/Copenhagen
    public DateTime SavedAt { get; set; }         // UTC, sat af backend
}