#include "OpenMeteoClient.h"
#include <ArduinoJson.h>

OpenMeteoClient::OpenMeteoClient(const char* host, uint16_t port)
  : http(ssl, host, port) {}

bool OpenMeteoClient::fetch(uint8_t cityIndex, WeatherData& result, String& errorText) {
  if (WiFi.status() != WL_CONNECTED) {
    errorText = "Ingen WiFi";
    return false;
  }

  String path = buildPath(CITIES[cityIndex]);
  Serial.print("GET ");
  Serial.println(path);

  if (http.get(path) != 0) {
    errorText = "Ingen forbindelse";
    http.stop();
    return false;
  }

  int status = http.responseStatusCode();
  Serial.print("Status: ");
  Serial.println(status);
  if (status != 200) {
    errorText = "HTTP " + String(status);
    http.stop();
    return false;
  }
  http.skipResponseHeaders();

  bool ok = parseResponse(cityIndex, result, errorText);
  http.stop();
  if (ok) logWeather(result);
  return ok;
}

String OpenMeteoClient::buildPath(const City& city) {
  String timezone = city.timezone;
  timezone.replace("/", "%2F");

  return "/v1/forecast?latitude=" + String(city.latitude, 2) +
         "&longitude=" + String(city.longitude, 2) +
         "&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
         "&wind_speed_unit=ms&timezone=" + timezone;
}

bool OpenMeteoClient::parseResponse(uint8_t cityIndex, WeatherData& result, String& errorText) {
  // Filteret sørger for, at kun de felter, vi bruger, gemmes i RAM
  JsonDocument filter;
  filter["error"] = true;
  filter["reason"] = true;
  filter["current"]["time"] = true;
  filter["current"]["temperature_2m"] = true;
  filter["current"]["relative_humidity_2m"] = true;
  filter["current"]["wind_speed_10m"] = true;
  filter["current_units"]["temperature_2m"] = true;
  filter["current_units"]["relative_humidity_2m"] = true;
  filter["current_units"]["wind_speed_10m"] = true;

  JsonDocument doc;
  DeserializationError jsonError =
      deserializeJson(doc, http, DeserializationOption::Filter(filter));

  if (jsonError) {
    Serial.print("JSON-fejl: ");
    Serial.println(jsonError.c_str());
    errorText = "JSON-fejl";
    return false;
  }
  if (doc["error"] | false) {
    Serial.print("API-fejl: ");
    Serial.println(doc["reason"] | "ukendt");
    errorText = "API-fejl";
    return false;
  }

  JsonObject current = doc["current"];
  JsonObject units   = doc["current_units"];
  if (!current["temperature_2m"].is<float>()) {
    errorText = "Mangler data";
    return false;
  }

  result.cityIndex   = cityIndex;
  result.temperature = current["temperature_2m"];
  result.humidity    = current["relative_humidity_2m"].as<int>();
  result.windSpeed   = current["wind_speed_10m"];
  strlcpy(result.dataTime,        current["time"] | "",                  sizeof(result.dataTime));
  strlcpy(result.temperatureUnit, units["temperature_2m"] | "°C",        sizeof(result.temperatureUnit));
  strlcpy(result.humidityUnit,    units["relative_humidity_2m"] | "%",   sizeof(result.humidityUnit));
  strlcpy(result.windSpeedUnit,   units["wind_speed_10m"] | "m/s",       sizeof(result.windSpeedUnit));
  result.valid = true;
  return true;
}

// Bemærk: snprintf med %f virker ikke på SAMD-kortene, derfor Serial.print
void OpenMeteoClient::logWeather(const WeatherData& weather) {
  Serial.print(CITIES[weather.cityIndex].name);
  Serial.print(": ");
  Serial.print(weather.temperature, 1); Serial.print(" ");
  Serial.print(weather.temperatureUnit); Serial.print(", ");
  Serial.print(weather.humidity);       Serial.print(" ");
  Serial.print(weather.humidityUnit);   Serial.print(", ");
  Serial.print(weather.windSpeed, 1);   Serial.print(" ");
  Serial.print(weather.windSpeedUnit);  Serial.print(" @ ");
  Serial.println(weather.dataTime);
}
