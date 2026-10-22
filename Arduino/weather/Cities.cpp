#include "Cities.h"

const City CITIES[] = {
  {"Aarhus",     "Aarhus",      56.16, 10.20, "Europe/Copenhagen"},
  {"København",  "Koebenhavn",  55.68, 12.57, "Europe/Copenhagen"},
  {"Ringkøbing", "Ringkoebing", 56.09,  8.24, "Europe/Copenhagen"},
};

const uint8_t CITY_COUNT = sizeof(CITIES) / sizeof(CITIES[0]);
