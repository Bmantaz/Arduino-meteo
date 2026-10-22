#pragma once

#include <Arduino_MKRIoTCarrier.h>
#include "WeatherData.h"

// Alt, der har med skærm og LED-ring at gøre.
// Hver show-metode sætter både tekst og passende farve på ringen.
class Display {
public:
  explicit Display(MKRIoTCarrier& carrier);

  void begin();

  void showBusy(const char* title, const char* line1, const char* line2 = "");   // cyan / blå ring
  void showSuccess(const char* title, const char* line1);                         // grøn / grøn ring
  void showError(const char* title, const char* line1, const char* line2 = "");  // rød / rød ring
  void showWeather(const WeatherData& weather);

private:
  static const uint32_t RING_BLUE  = 0x000030;
  static const uint32_t RING_GREEN = 0x003000;
  static const uint32_t RING_RED   = 0x300000;

  void setRing(uint32_t color);
  void showMessage(const char* title, uint16_t titleColor,
                   const char* line1, const char* line2);
  void printCentered(const char* text, int y, uint8_t size);
  void printValue(int y, const char* label, float value, uint8_t decimals, const char* unit);

  MKRIoTCarrier& carrier;
};
