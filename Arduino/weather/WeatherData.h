#pragma once

#include <Arduino.h>

// Én vejrmåling for én by, som hentet fra Open-Meteo.
// Faste char-arrays i stedet for String: kendt størrelse og ingen
// fragmentering af den lille RAM på MKR WiFi 1010.
struct WeatherData {
  bool    valid       = false;
  uint8_t cityIndex   = 0;     // plads i CITIES
  float   temperature = 0;
  int     humidity    = 0;     // hele procent (backend forventer int)
  float   windSpeed   = 0;
  char    temperatureUnit[8] = "";
  char    humidityUnit[8]    = "";
  char    windSpeedUnit[8]   = "";
  char    dataTime[17]       = "";  // "2026-10-21T14:00"
};
