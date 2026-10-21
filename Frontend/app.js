"use strict";

/* ====================================================================
   Indstillinger – det er kun her, der skal rettes fredag
   ==================================================================== */

// true  = kør på testdata i browseren (ingen backend nødvendig)
// false = hent rigtige data fra backend
const USE_MOCK = true;

// Backendens adresse. Fredag: computerens IP + porten backend lytter på,
// fx "http://192.168.1.42:5240/api/weather"
const API_URL = "http://localhost:5240/api/weather";

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
let highestId = null;                    // højeste id vi har set
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

  // Marker det, der er kommet til siden sidste hentning
  const idsHere = records.map(r => Number(r.id)).filter(Number.isFinite);
  const maxHere = idsHere.length ? Math.max(...idsHere) : null;

  if (rebaseline || highestId === null) {
    newIds = new Set();
    rebaseline = false;
  } else {
    newIds = new Set(idsHere.filter(id => id > highestId));
  }

  if (maxHere !== null) {
    highestId = highestId === null ? maxHere : Math.max(highestId, maxHere);
  }

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
  const id = Number(r.id);
  const isNew = newIds.has(id);

  const li = el("li", "card");
  li.dataset.id = Number.isFinite(id) ? String(id) : "";
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

  li.appendChild(definitions("details", [
    ["Måletidspunkt", formatDataTime(r.dataTime) + (r.timezone ? ` (${r.timezone})` : "")],
    ["Gemt", formatSavedAt(r.savedAt)],
    ["Position", formatPosition(r.latitude, r.longitude)],
    ["Kilde", (r.api || "ukendt") + (Number.isFinite(id) ? ` · #${id}` : "")]
  ]));

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

// dataTime er lokal tid fra Open-Meteo UDEN tidszone ("2026-10-21T14:00").
// Den læses derfor som tekst – ellers ville browseren flytte klokkeslættet.
function formatDataTime(value) {
  if (typeof value !== "string") return "–";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return value;
  const [, year, month, day, hour, minute] = m;
  return `${day}-${month}-${year} kl. ${hour}:${minute}`;
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

function formatPosition(lat, lon) {
  const a = Number(lat), b = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "–";
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
  return Number(b.id) - Number(a.id);
}


/* ====================================================================
   Testdata – bruges kun når USE_MOCK = true
   ==================================================================== */

const MOCK_CITIES = [
  { city: "Aarhus", latitude: 56.16, longitude: 10.20 },
  { city: "København", latitude: 55.68, longitude: 12.57 },
  { city: "Ringkøbing", latitude: 56.09, longitude: 8.24 }
];

let mockRecords = [
  mockRecord(1, MOCK_CITIES[0], 11.3, 87, 4.2, "2026-10-21T14:00", "2026-10-21T14:03:11+02:00"),
  mockRecord(2, MOCK_CITIES[1], 12.8, 74, 6.1, "2026-10-21T14:00", "2026-10-21T14:05:02+02:00"),
  mockRecord(3, MOCK_CITIES[2], 10.4, 91, 9.7, "2026-10-21T15:00", "2026-10-21T15:01:40+02:00")
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
  const nextId = Math.max(...mockRecords.map(r => r.id)) + 1;
  const sted = MOCK_CITIES[nextId % MOCK_CITIES.length];
  const now = new Date();

  const dataTime =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;

  return mockRecord(
    nextId,
    sted,
    Math.round((6 + Math.random() * 10) * 10) / 10,
    Math.round(60 + Math.random() * 40),
    Math.round(Math.random() * 120) / 10,
    dataTime,
    now.toISOString()
  );
}

function mockRecord(id, sted, temperature, humidity, windSpeed, dataTime, savedAt) {
  return {
    id,
    api: "Open-Meteo",
    city: sted.city,
    latitude: sted.latitude,
    longitude: sted.longitude,
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
