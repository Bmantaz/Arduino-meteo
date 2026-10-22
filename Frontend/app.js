"use strict";

/* ====================================================================
   Indstillinger – det er kun her, der skal rettes fredag
   ==================================================================== */

// true  = kør på testdata i browseren (ingen backend nødvendig)
// false = hent rigtige data fra backend
const USE_MOCK = false;

// Backendens adresse. Ruten hedder /api/weather-records (ikke /api/weather),
// og porten står i Backend/WeatherApi/Properties/launchSettings.json.
// Fredag: computerens IP i stedet for localhost,
// fx "http://192.168.1.42:5144/api/weather-records"
const API_URL = "http://localhost:5144/api/weather-records";

// Hvor tit listen opdaterer sig selv (millisekunder)
const REFRESH_MS = 10000;

// Byerne der er hardcodet på Arduinoen. Står her, så byfilteret
// også virker før der er gemt noget i databasen.
const KNOWN_CITIES = ["Aarhus", "København", "Ringkøbing"];


/* ====================================================================
   Tilstand
   ==================================================================== */

let records = [];                        // det vi viser lige nu
let cities = new Set(KNOWN_CITIES);      // byer i byfilteret
let seenIds = new Set();                 // id'er vi har set i en tidligere hentning
let newIds = new Set();                  // id'er der skal have "Ny"
let rebaseline = true;                   // næste hentning må ikke markere noget som nyt
let requestNo = 0;                       // så et gammelt svar ikke overskriver et nyt
let timer = null;

const elList = document.getElementById("list");
const elStatus = document.getElementById("status");
const elMeta = document.getElementById("meta");
const elCityFilter = document.getElementById("cityFilter");
const elRefreshBtn = document.getElementById("refreshBtn");
const elAutoToggle = document.getElementById("autoToggle");
const elMockBanner = document.getElementById("mockBanner");


/* ====================================================================
   Opstart
   ==================================================================== */

document.addEventListener("DOMContentLoaded", start);

function start() {
  elMockBanner.hidden = !USE_MOCK;
  document.getElementById("autoLabel").textContent =
    `Opdatér automatisk (${REFRESH_MS / 1000} s)`;

  elRefreshBtn.addEventListener("click", () => {
    load();
    startTimer();        // nulstil uret, så den ikke henter igen med det samme
  });

  elCityFilter.addEventListener("change", () => {
    rebaseline = true;   // skift af filter må ikke udløse en masse "Ny"
    newIds.clear();
    load();
    startTimer();
  });

  elAutoToggle.addEventListener("change", startTimer);

  renderCityFilter();
  load();
  startTimer();
}


/* ====================================================================
   Hentning
   ==================================================================== */

function startTimer() {
  clearInterval(timer);
  if (elAutoToggle.checked) {
    timer = setInterval(load, REFRESH_MS);
  }
}

async function load() {
  const myRequest = ++requestNo;
  setBusy(true);

  if (records.length === 0) {
    showStatus("Henter data …", "info");
  }

  try {
    const data = USE_MOCK
      ? await fetchMock(elCityFilter.value)
      : await fetchApi(elCityFilter.value);

    if (myRequest !== requestNo) return;   // et nyere kald har overhalet dette
    applyData(data);
  } catch (err) {
    if (myRequest !== requestNo) return;
    // Listen bliver stående, så en enkelt fejlet hentning ikke tømmer skærmen
    showStatus("Kunne ikke hente data: " + err.message, "error");
  } finally {
    if (myRequest === requestNo) setBusy(false);
  }
}

async function fetchApi(city) {
  const url = new URL(API_URL, window.location.href);
  if (city) url.searchParams.set("city", city);

  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    cache: "no-store"
  });

  if (!res.ok) {
    let message = "HTTP " + res.status;
    try {
      const body = await res.json();
      if (body && body.error) message += " – " + body.error;
    } catch (ignored) { /* svaret var ikke JSON */ }
    throw new Error(message);
  }

  return await res.json();
}

function applyData(data) {
  if (!Array.isArray(data)) {
    showStatus("Backend svarede ikke med en liste.", "error");
    return;
  }

  // Backend sorterer nyeste først, men vi gør det igen for en sikkerheds skyld
  records = data.slice().sort(compareNewestFirst);

  // Marker det, der er kommet til siden sidste hentning.
  // Backendens id er en Guid (tekst), så vi kan ikke regne med at nye id'er
  // er større end gamle – vi husker i stedet dem, vi har set før.
  const idsHere = records.map(r => String(r.id)).filter(id => id && id !== "undefined");

  newIds = rebaseline
    ? new Set()
    : new Set(idsHere.filter(id => !seenIds.has(id)));
  rebaseline = false;

  for (const id of idsHere) seenIds.add(id);

  // Byfilteret lærer nye byer at kende, men glemmer ikke de gamle
  for (const r of records) {
    if (r.city) cities.add(r.city);
  }
  renderCityFilter();

  render();
}


/* ====================================================================
   Visning
   ==================================================================== */

function render() {
  elList.textContent = "";

  if (records.length === 0) {
    const by = elCityFilter.value;
    showStatus(
      by ? `Ingen målinger gemt for ${by} endnu.` : "Ingen målinger gemt endnu.",
      "empty"
    );
  } else {
    showStatus("", null);
    for (const r of records) {
      elList.appendChild(renderCard(r));
    }
  }

  elMeta.textContent =
    `${records.length} ${records.length === 1 ? "måling" : "målinger"}` +
    ` · opdateret ${formatClock(new Date())}`;
}

function renderCard(r) {
  const id = String(r.id);
  const isNew = newIds.has(id);

  const li = el("li", "card");
  li.dataset.id = id;
  if (isNew) li.classList.add("is-new");

  const top = el("div", "card-top");
  top.appendChild(el("h2", "city", r.city || "Ukendt by"));
  if (isNew) top.appendChild(el("span", "badge", "Ny"));
  li.appendChild(top);

  li.appendChild(el("p", "temp", formatValue(r.temperature, r.temperatureUnit, 1)));

  li.appendChild(definitions("values", [
    ["Luftfugtighed", formatValue(r.humidity, r.humidityUnit, 0)],
    ["Vind", formatValue(r.windSpeed, r.windSpeedUnit, 1)]
  ]));

  const detaljer = [
    ["Måletidspunkt", formatDataTime(r.dataTime, r.timezone) + (r.timezone ? ` (${r.timezone})` : "")],
    ["Gemt", formatSavedAt(r.savedAt)]
  ];

  // Backenden gemmer ikke koordinater, så rækken springes over når de mangler
  const position = formatPosition(r.latitude, r.longitude);
  if (position) detaljer.push(["Position", position]);

  detaljer.push(["Kilde", (r.api || "ukendt") + (id ? ` · ${kortId(id)}` : "")]);
  li.appendChild(definitions("details", detaljer));

  return li;
}

function definitions(className, rows) {
  const dl = el("dl", className);
  for (const [label, value] of rows) {
    const row = el("div", "row");
    row.appendChild(el("dt", null, label));
    row.appendChild(el("dd", null, value));
    dl.appendChild(row);
  }
  return dl;
}

function renderCityFilter() {
  const valgt = elCityFilter.value;
  elCityFilter.textContent = "";

  const alle = el("option", null, "Alle byer");
  alle.value = "";
  elCityFilter.appendChild(alle);

  for (const by of [...cities].sort((a, b) => a.localeCompare(b, "da"))) {
    const option = el("option", null, by);
    option.value = by;
    elCityFilter.appendChild(option);
  }

  // Behold det valgte – findes byen ikke længere, falder vi tilbage til "Alle byer"
  elCityFilter.value = valgt;
  if (elCityFilter.selectedIndex === -1) elCityFilter.value = "";
}

function showStatus(text, kind) {
  elStatus.textContent = text;
  elStatus.className = "status" + (kind ? " status--" + kind : "");
  elStatus.hidden = !text;
}

function setBusy(busy) {
  elRefreshBtn.disabled = busy;
  document.body.classList.toggle("is-busy", busy);
}


/* ====================================================================
   Formatering
   ==================================================================== */

function formatNumber(value, decimals) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "–";
  return n.toLocaleString("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

function formatValue(value, unit, decimals) {
  const n = formatNumber(value, decimals);
  if (n === "–" || !unit) return n;
  return n + " " + unit;          // hårdt mellemrum, så tal og enhed ikke deles
}

// Backenden regner måletidspunktet om til UTC før det gemmes
// ("2026-10-21T12:00:00Z"), så her vises det i målingens egen tidszone –
// altså det klokkeslæt Arduinoen viste på skærmen.
// Kommer der en tekst UDEN tidszone ("2026-10-21T14:00"), er den allerede
// lokal tid, og så læses den som ren tekst; ellers ville browseren flytte den.
function formatDataTime(value, timezone) {
  if (typeof value !== "string") return "–";

  const harTidszone = /(Z|[+-]\d{2}:?\d{2})$/.test(value.trim());

  if (!harTidszone) {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!m) return value;
    const [, aar, maaned, dag, time, minut] = m;
    return `${dag}-${maaned}-${aar} kl. ${time}:${minut}`;
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  try {
    const dele = {};
    const formatter = new Intl.DateTimeFormat("da-DK", {
      timeZone: timezone || undefined,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    for (const del of formatter.formatToParts(d)) dele[del.type] = del.value;
    return `${dele.day}-${dele.month}-${dele.year} kl. ${dele.hour}:${dele.minute}`;
  } catch (ukendtTidszone) {
    // ukendt tidszonenavn – vis i computerens egen tid i stedet
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}` +
           ` kl. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

// Guid'er er lange, så kortet viser kun første del: #a1b2c3d4
function kortId(id) {
  return "#" + (id.includes("-") ? id.split("-")[0] : id);
}

// savedAt kommer fra databasen med tidszone og vises i computerens lokale tid.
function formatSavedAt(value) {
  if (!value) return "–";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} kl. ${formatClock(d)}`;
}

function formatClock(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Tom tekst betyder "vis ikke rækken" – backenden gemmer ikke koordinater
function formatPosition(lat, lon) {
  if (lat === undefined || lat === null || lon === undefined || lon === null) return "";
  const a = Number(lat), b = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "";
  return `${a.toFixed(2)}, ${b.toFixed(2)}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;   // textContent, aldrig innerHTML
  return node;
}

function compareNewestFirst(a, b) {
  const ta = Date.parse(a.savedAt), tb = Date.parse(b.savedAt);
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
  return String(b.id).localeCompare(String(a.id));   // id er en Guid, ikke et tal
}


/* ====================================================================
   Testdata – bruges kun når USE_MOCK = true
   Efterligner backendens svar: Guid som id, tidspunkter i UTC
   og ingen koordinater.
   ==================================================================== */

const MOCK_CITIES = ["Aarhus", "København", "Ringkøbing"];

let mockRecords = [
  mockRecord("3f1a7c80-1111-4a21-9c01-aa0000000001", "Aarhus",
             11.3, 87, 4.2, "2026-10-21T12:00:00Z", "2026-10-21T12:03:11Z"),
  mockRecord("3f1a7c80-2222-4a21-9c01-aa0000000002", "København",
             12.8, 74, 6.1, "2026-10-21T12:00:00Z", "2026-10-21T12:05:02Z"),
  mockRecord("3f1a7c80-3333-4a21-9c01-aa0000000003", "Ringkøbing",
             10.4, 91, 9.7, "2026-10-21T13:00:00Z", "2026-10-21T13:01:40Z")
].sort(compareNewestFirst);

let mockCounter = 0;

// Hver 3. hentning kommer der en ny måling, så "Ny"-markeringen kan afprøves
async function fetchMock(city) {
  await new Promise(resolve => setTimeout(resolve, 250));

  mockCounter++;
  if (mockCounter > 1 && mockCounter % 3 === 0) {
    mockRecords.unshift(nextMockRecord());
  }

  const copy = mockRecords.map(r => Object.assign({}, r));
  return city ? copy.filter(r => r.city === city) : copy;
}

function nextMockRecord() {
  const now = new Date();
  const hel = new Date(now);
  hel.setMinutes(0, 0, 0);                 // Open-Meteo giver hele timer

  return mockRecord(
    mockGuid(),
    MOCK_CITIES[mockRecords.length % MOCK_CITIES.length],
    Math.round((6 + Math.random() * 10) * 10) / 10,
    Math.round(60 + Math.random() * 40),
    Math.round(Math.random() * 120) / 10,
    hel.toISOString(),
    now.toISOString()
  );
}

function mockGuid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
         "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
           const r = Math.random() * 16 | 0;
           return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
         });
}

function mockRecord(id, city, temperature, humidity, windSpeed, dataTime, savedAt) {
  return {
    id,
    api: "Open-Meteo",
    city,
    temperature,
    temperatureUnit: "°C",
    humidity,
    humidityUnit: "%",
    windSpeed,
    windSpeedUnit: "m/s",
    dataTime,
    timezone: "Europe/Copenhagen",
    savedAt
  };
}
