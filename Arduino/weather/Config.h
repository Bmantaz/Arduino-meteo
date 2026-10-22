#pragma once

#include <Arduino.h>

// Faste indstillinger for hele programmet.
// Wi-Fi-kode og backendens IP/port står i arduino_secrets.h (ikke på GitHub).

// ---------- Open-Meteo ----------
constexpr const char*   OPEN_METEO_HOST   = "api.open-meteo.com";
constexpr uint16_t      OPEN_METEO_PORT   = 443;
constexpr unsigned long FETCH_INTERVAL_MS = 5UL * 60UL * 1000UL;  // 5 minutter

// ---------- Backend ----------
constexpr const char* BACKEND_PATH           = "/api/weather-records";
constexpr int         BACKEND_CREATED_STATUS = 201;  // kun 201 tæller som "Gemt"

// ---------- Midlertidig test mod webhook.site ----------
// true  = send til webhook.site (HTTPS). WEBHOOK_STATUS skal passe med det
//         svar, webhook.site er sat op til (standard er 200).
// false = send til gruppens backend fra arduino_secrets.h
constexpr bool        USE_WEBHOOK_TEST = false;
constexpr const char* WEBHOOK_HOST     = "webhook.site";
constexpr uint16_t    WEBHOOK_PORT     = 443;
constexpr const char* WEBHOOK_PATH     = "/4d2008cf-de46-4ad1-9611-0ef1f963ea1b";
constexpr int         WEBHOOK_STATUS   = 201;

// ---------- Brugerflade ----------
constexpr unsigned long MESSAGE_DURATION_MS = 2000;  // hvor længe "Gemt"/"Fejl" vises
constexpr uint8_t       WIFI_MAX_ATTEMPTS   = 3;
