#pragma once

#include <WiFiNINA.h>
#include <ArduinoHttpClient.h>
#include "Cities.h"
#include "WeatherData.h"

// Ansvar: hente og tolke det aktuelle vejr fra Open-Meteo.
class OpenMeteoClient {
public:
  OpenMeteoClient(const char* host, uint16_t port);

  // Udfylder result og returnerer true ved succes.
  // Ved fejl står en kort forklaring til skærmen i errorText.
  bool fetch(uint8_t cityIndex, WeatherData& result, String& errorText);

private:
  String buildPath(const City& city);
  bool   parseResponse(uint8_t cityIndex, WeatherData& result, String& errorText);
  void   logWeather(const WeatherData& weather);

  WiFiSSLClient ssl;   // skal stå før http: http bruger ssl
  HttpClient    http;
};
