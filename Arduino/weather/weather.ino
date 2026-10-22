// Vejrstation: henter vejret fra Open-Meteo, viser det på MKR IoT Carrier
// og gemmer målingen i gruppens backend, når man trykker på TOUCH2.
//
// Filer:
//   Config.h                faste indstillinger (host, interval, rute)
//   Cities.h/.cpp           listen over byer
//   WeatherData.h           én vejrmåling
//   Display.h/.cpp          skærm og LED-ring
//   WifiConnection.h/.cpp   Wi-Fi
//   OpenMeteoClient.h/.cpp  hent + tolk JSON fra Open-Meteo
//   BackendClient.h/.cpp    POST til backend
//   arduino_secrets.h       Wi-Fi-kode og backend-IP (kopiér arduino_secrets.example.h)

#include <Arduino_MKRIoTCarrier.h>
#include "arduino_secrets.h"
#include "Config.h"
#include "Cities.h"
#include "WeatherData.h"
#include "Display.h"
#include "WifiConnection.h"
#include "OpenMeteoClient.h"
#include "BackendClient.h"

// ---------- Hvor målingerne gemmes (vælges med USE_WEBHOOK_TEST i Config.h) ----------
const BackendSettings WEBHOOK_TEST  = {WEBHOOK_HOST, WEBHOOK_PORT, WEBHOOK_PATH, true,  WEBHOOK_STATUS};
const BackendSettings GROUP_BACKEND = {BACKEND_HOST, BACKEND_PORT, BACKEND_PATH, false, BACKEND_CREATED_STATUS};

// ---------- Objekter (ét for hvert ansvarsområde) ----------
MKRIoTCarrier   carrier;
Display         display(carrier);
WifiConnection  wifi(SECRET_SSID, SECRET_PASS);
OpenMeteoClient openMeteo(OPEN_METEO_HOST, OPEN_METEO_PORT);
BackendClient   backend(USE_WEBHOOK_TEST ? WEBHOOK_TEST : GROUP_BACKEND);

// ---------- Programmets tilstand ----------
WeatherData   weather;
uint8_t       currentCity    = 0;
unsigned long lastFetchMs    = 0;
unsigned long messageUntilMs = 0;  // 0 = ingen midlertidig besked på skærmen

// ---------- Setup og loop ----------
void setup() {
  startSerial();
  startCarrier();

  if (!wifi.hasModule()) {
    display.showError("Fejl", "WiFi-modul", "svarer ikke");
    haltForever();
  }

  if (connectWifi()) fetchAndShow();
}

void loop() {
  handleTouch();
  handleMessageTimeout();
  handleAutoRefresh();
}

// ---------- Opstart ----------
void startSerial() {
  Serial.begin(9600);
  unsigned long startedMs = millis();
  while (!Serial && millis() - startedMs < 3000) {}
}

void startCarrier() {
  carrier.noCase();  // brug carrier.withCase(); hvis den er i plastkabinettet
  if (!carrier.begin()) {
    Serial.println("Carrier kunne ikke starte");
    haltForever();
  }
  display.begin();
}

void haltForever() {
  while (true) { delay(100); }
}

bool connectWifi() {
  for (uint8_t attempt = 1; attempt <= WIFI_MAX_ATTEMPTS; attempt++) {
    char attemptText[20];
    snprintf(attemptText, sizeof(attemptText), "Forsoeg %d af %d", attempt, WIFI_MAX_ATTEMPTS);
    display.showBusy("Forbinder", wifi.ssid(), attemptText);
    if (wifi.tryConnect()) return true;
    delay(1000);
  }
  display.showError("Ingen WiFi", "Tjek navn og kode", "Tryk reset");
  return false;
}

// ---------- Handlinger i loop() ----------
void handleTouch() {
  carrier.Buttons.update();

  if (carrier.Buttons.onTouchDown(TOUCH0)) selectCity(-1);  // forrige by
  if (carrier.Buttons.onTouchDown(TOUCH4)) selectCity(+1);  // næste by
  if (carrier.Buttons.onTouchDown(TOUCH2)) saveCurrent();   // gem det viste
}

// Efter "Gemt"/"Fejl": vis vejret igen
void handleMessageTimeout() {
  if (messageUntilMs == 0 || (long)(millis() - messageUntilMs) < 0) return;

  messageUntilMs = 0;
  if (weather.valid) display.showWeather(weather);
}

// Automatisk opdatering hvert 5. minut
void handleAutoRefresh() {
  if (millis() - lastFetchMs < FETCH_INTERVAL_MS) return;

  if (!wifi.isConnected() && !connectWifi()) {
    lastFetchMs = millis();  // prøv igen om 5 minutter
    return;
  }
  fetchAndShow();
}

// ---------- Hjælpefunktioner ----------
void selectCity(int step) {
  currentCity = (currentCity + step + CITY_COUNT) % CITY_COUNT;
  fetchAndShow();
}

void fetchAndShow() {
  messageUntilMs = 0;
  display.showBusy("Henter...", CITIES[currentCity].displayName);
  weather.valid = false;

  String errorText;
  if (openMeteo.fetch(currentCity, weather, errorText)) {
    display.showWeather(weather);
  } else {
    display.showError("Fejl ved", "hentning:", errorText.c_str());
    Serial.print("Fejl: ");
    Serial.println(errorText);
  }
  lastFetchMs = millis();
}

void saveCurrent() {
  if (!weather.valid) {
    display.showError("Fejl", "Intet at gemme");
    showMessageFor(MESSAGE_DURATION_MS);
    return;
  }

  const char* cityName = CITIES[weather.cityIndex].displayName;
  display.showBusy("Gemmer...", cityName);

  String errorText;
  if (backend.save(weather, errorText)) {
    display.showSuccess("Gemt", cityName);
  } else {
    display.showError("Fejl ved", "gemning:", errorText.c_str());
  }
  showMessageFor(MESSAGE_DURATION_MS);
}

void showMessageFor(unsigned long durationMs) {
  messageUntilMs = millis() + durationMs;
}
