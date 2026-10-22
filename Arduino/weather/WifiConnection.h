#pragma once

#include <Arduino.h>

// Ansvar: forbindelsen til Wi-Fi. Viser intet på skærmen selv.
class WifiConnection {
public:
  WifiConnection(const char* ssid, const char* password);

  bool        hasModule() const;
  bool        isConnected() const;
  bool        tryConnect();  // ét forsøg, blokerer til WiFiNINA giver op
  const char* ssid() const { return networkName; }

private:
  const char* networkName;
  const char* password;
};
