#pragma once

#include <Arduino.h>

struct City {
  const char* name;         // sendes til backend
  const char* displayName;  // vises på skærmen (uden æ, ø, å)
  float       latitude;
  float       longitude;
  const char* timezone;
};

// Defineret i Cities.cpp. "extern" betyder: listen findes ét sted,
// men alle filer, der inkluderer denne header, må bruge den.
extern const City    CITIES[];
extern const uint8_t CITY_COUNT;
