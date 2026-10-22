#include "WifiConnection.h"
#include <WiFiNINA.h>

WifiConnection::WifiConnection(const char* ssid, const char* password)
  : networkName(ssid), password(password) {}

bool WifiConnection::hasModule() const {
  return WiFi.status() != WL_NO_MODULE;
}

bool WifiConnection::isConnected() const {
  return WiFi.status() == WL_CONNECTED;
}

bool WifiConnection::tryConnect() {
  return WiFi.begin(networkName, password) == WL_CONNECTED;
}
