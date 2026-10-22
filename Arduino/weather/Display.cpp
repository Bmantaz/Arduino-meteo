#include "Display.h"
#include "Cities.h"

static const int SCREEN_WIDTH = 240;
static const int CHAR_WIDTH   = 6;  // pixels pr. tegn ved tekststørrelse 1

Display::Display(MKRIoTCarrier& carrier) : carrier(carrier) {}

void Display::begin() {
  carrier.display.setRotation(0);
  carrier.display.setTextWrap(false);
}

void Display::showBusy(const char* title, const char* line1, const char* line2) {
  showMessage(title, ST77XX_CYAN, line1, line2);
  setRing(RING_BLUE);
}

void Display::showSuccess(const char* title, const char* line1) {
  showMessage(title, ST77XX_GREEN, line1, "");
  setRing(RING_GREEN);
}

void Display::showError(const char* title, const char* line1, const char* line2) {
  showMessage(title, ST77XX_RED, line1, line2);
  setRing(RING_RED);
}

void Display::showWeather(const WeatherData& weather) {
  const City& city = CITIES[weather.cityIndex];
  carrier.display.fillScreen(ST77XX_BLACK);

  carrier.display.setTextColor(ST77XX_CYAN);
  uint8_t nameSize = strlen(city.displayName) <= 8 ? 3 : 2;
  printCentered(city.displayName, 45, nameSize);

  char position[8];
  snprintf(position, sizeof(position), "%d/%d", weather.cityIndex + 1, CITY_COUNT);
  carrier.display.setTextColor(ST77XX_WHITE);
  printCentered(position, 72, 1);

  printValue(95,  "Temp: ", weather.temperature, 1, "C");  // skærmen kan ikke vise °
  printValue(125, "Fugt: ", weather.humidity,    0, weather.humidityUnit);
  printValue(155, "Vind: ", weather.windSpeed,   1, weather.windSpeedUnit);

  // dataTime er "2026-10-21T14:00" - klokkeslættet starter ved tegn 11
  if (strlen(weather.dataTime) > 11) {
    char timeText[12];
    snprintf(timeText, sizeof(timeText), "Kl. %s", weather.dataTime + 11);
    printCentered(timeText, 185, 2);
  }

  setRing(RING_GREEN);
}

void Display::setRing(uint32_t color) {
  for (int i = 0; i < NUMPIXELS; i++) carrier.leds.setPixelColor(i, color);
  carrier.leds.show();
}

void Display::showMessage(const char* title, uint16_t titleColor,
                          const char* line1, const char* line2) {
  carrier.display.fillScreen(ST77XX_BLACK);
  carrier.display.setTextSize(3);
  carrier.display.setTextColor(titleColor);
  carrier.display.setCursor(30, 70);
  carrier.display.print(title);

  carrier.display.setTextSize(2);
  carrier.display.setTextColor(ST77XX_WHITE);
  carrier.display.setCursor(30, 120);
  carrier.display.print(line1);
  carrier.display.setCursor(30, 150);
  carrier.display.print(line2);
}

void Display::printCentered(const char* text, int y, uint8_t size) {
  int width = strlen(text) * CHAR_WIDTH * size;
  carrier.display.setTextSize(size);
  carrier.display.setCursor((SCREEN_WIDTH - width) / 2, y);
  carrier.display.print(text);
}

void Display::printValue(int y, const char* label, float value, uint8_t decimals, const char* unit) {
  carrier.display.setTextSize(2);
  carrier.display.setCursor(35, y);
  carrier.display.print(label);
  carrier.display.print(value, decimals);
  carrier.display.print(" ");
  carrier.display.print(unit);
}
