#pragma once

#include <WiFiNINA.h>
#include <ArduinoHttpClient.h>
#include "WeatherData.h"

// Hvor målingerne sendes hen, og hvilket svar der tæller som "Gemt"
struct BackendSettings {
  const char* host;
  uint16_t    port;
  const char* path;
  bool        useSsl;         // true = HTTPS (webhook.site), false = HTTP (lokal backend)
  int         successStatus;  // 201 for gruppens backend
};

// Ansvar: sende en vejrmåling til backend.
class BackendClient {
public:
  explicit BackendClient(const BackendSettings& settings);

  // Returnerer true kun hvis backend svarer med settings.successStatus.
  bool save(const WeatherData& weather, String& errorText);

private:
  String buildPayload(const WeatherData& weather);

  const char*   path;
  int           successStatus;
  WiFiClient    plainClient;  // klienterne skal stå før http: http bruger en af dem
  WiFiSSLClient sslClient;
  HttpClient    http;
};
