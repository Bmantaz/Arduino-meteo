#include "BackendClient.h"
#include <ArduinoJson.h>
#include "Cities.h"

BackendClient::BackendClient(const BackendSettings& settings)
  : path(settings.path),
    successStatus(settings.successStatus),
    http(settings.useSsl ? (Client&)sslClient : (Client&)plainClient,
         settings.host, settings.port) {}

bool BackendClient::save(const WeatherData& weather, String& errorText) {
  if (WiFi.status() != WL_CONNECTED) {
    errorText = "Ingen WiFi";
    return false;
  }

  String body = buildPayload(weather);
  Serial.print("POST ");
  Serial.println(body);

  if (http.post(path, "application/json", body) != 0) {
    errorText = "Ingen forbindelse";
    http.stop();
    return false;
  }

  int    status   = http.responseStatusCode();
  String response = http.responseBody();
  http.stop();

  Serial.print("Status: ");
  Serial.println(status);
  Serial.print("Svar: ");
  Serial.println(response);

  if (status != successStatus) {
    errorText = "HTTP " + String(status);  // detaljer står i Serial Monitor
    return false;
  }
  return true;
}

// Bygger JSON præcis som example-payload.json
String BackendClient::buildPayload(const WeatherData& weather) {
  const City& city = CITIES[weather.cityIndex];

  JsonDocument doc;
  doc["api"]             = "Open-Meteo";
  doc["city"]            = city.name;
  doc["temperature"]     = weather.temperature;
  doc["temperatureUnit"] = weather.temperatureUnit;
  doc["humidity"]        = weather.humidity;
  doc["humidityUnit"]    = weather.humidityUnit;
  doc["windSpeed"]       = weather.windSpeed;
  doc["windSpeedUnit"]   = weather.windSpeedUnit;
  doc["dataTime"]        = weather.dataTime;
  doc["timezone"]        = city.timezone;

  String body;
  serializeJson(doc, body);
  return body;
}
