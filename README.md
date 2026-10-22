# Vejrstation med Open-Meteo

Arduino Oplà henter det aktuelle vejr fra Open-Meteo og viser det på skærmen. Et tryk på TOUCH2 gemmer målingen i backend, som lægger den i en PostgreSQL-database på Neon. Frontenden viser de gemte målinger.

```
Open-Meteo → Arduino Oplà → backend (ASP.NET, port 5144) → Neon (PostgreSQL) → frontend
```

Neon er kun databasen. Backenden kører på en af gruppens computere, og både Arduino og frontend taler med backenden, aldrig direkte med Neon.

## Krav

- .NET 10 SDK
- Node.js (kun til den lille webserver til frontenden)
- Arduino IDE med bibliotekerne `Arduino_MKRIoTCarrier`, `WiFiNINA`, `ArduinoHttpClient` og `ArduinoJson` (v7)
- Arduino og backend-computer på **samme Wi-Fi**. Gæstenetværk virker ikke, fordi de blokerer trafik mellem enheder. Arduinoen kan kun bruge 2,4 GHz.

## 1. Backend

```
cd Backend/WeatherApi
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<forbindelsesstreng fra Neon>"
dotnet ef database update
dotnet run --launch-profile http
```

Forbindelsesstrengen gemmes med user-secrets uden for repoet. Den må aldrig skrives i `appsettings.json`.

Første gang skal port 5144 åbnes i Windows-firewallen (PowerShell som administrator):

```
New-NetFirewallRule -DisplayName "WeatherApi 5144" -Direction Inbound -Protocol TCP -LocalPort 5144 -Action Allow -Profile Any
```

Tjek at backenden svarer: `http://localhost:5144/api/weather-records`. Testkald ligger i `Backend/WeatherApi/WeatherApi.http`.

Hvis Windows blokerer `WeatherApi.exe` ("Access is denied"), kan backenden startes med:

```
dotnet build
$env:ASPNETCORE_ENVIRONMENT="Development"; $env:ASPNETCORE_URLS="http://0.0.0.0:5144"
dotnet bin/Debug/net10.0/WeatherApi.dll
```

### API

| Metode | Rute | Svar |
|---|---|---|
| `POST` | `/api/weather-records` | `201` med `{ id, status: "saved" }`, `400` ved ugyldige data |
| `GET` | `/api/weather-records?city=Aarhus` | Liste, nyeste først (`city` kan udelades) |

Payload: se `example-payload.json`.

## 2. Arduino

1. Kopiér `Arduino/weather/arduino_secrets.example.h` til `arduino_secrets.h` i samme mappe og udfyld Wi-Fi-navn, kode og backend-computerens IP-adresse (find den med `ipconfig`). Filen ignoreres af git.
2. Åbn `Arduino/weather/weather.ino` i Arduino IDE, vælg **Arduino MKR WiFi 1010** og upload.
3. `USE_WEBHOOK_TEST` i `Config.h` skal være `false`. Med `true` sendes der til webhook.site i stedet (til test uden backend).

Betjening: TOUCH0 forrige by, TOUCH4 næste by, TOUCH2 gem. Skærmen viser først **Gemt**, når backenden svarer `201`. Detaljer om fejl står i Serial Monitor (9600 baud).

Koden er delt op efter ansvar:

| Fil | Ansvar |
|---|---|
| `weather.ino` | `setup()`, kort `loop()` og touchbetjening |
| `Config.h` | Faste indstillinger |
| `Cities.h/.cpp` | Bylisten |
| `WeatherData.h` | Én vejrmåling |
| `Display.h/.cpp` | Skærm og LED-ring |
| `WifiConnection.h/.cpp` | Wi-Fi |
| `OpenMeteoClient.h/.cpp` | Hent og læs JSON fra Open-Meteo |
| `BackendClient.h/.cpp` | POST til backend |

## 3. Frontend

```
node Frontend/serve.js
```

Åbn `http://localhost:8080/`. Backendens adresse står i `API_URL` øverst i `Frontend/app.js`. Kører frontenden på en anden computer end backenden, skal `localhost` skiftes ud med backend-computerens IP. Med `USE_MOCK = true` vises testdata uden backend.
