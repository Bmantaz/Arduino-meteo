// Lille webserver til at vise frontenden paa http://localhost:8080/
//
//   node Frontend/serve.js          starter paa port 8080
//   node Frontend/serve.js 3000     starter paa port 3000
//
// Siden kan ogsaa bare aabnes ved at dobbeltklikke index.html, men saa
// sender browseren "Origin: null" til backend, og det afviser CORS nogle
// gange. Over http opfoerer den sig som en helt almindelig hjemmeside.
// Stop serveren med Ctrl+C.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.argv[2]) || 8080;
const ROD = __dirname;                       // mappen denne fil ligger i

const TYPER = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon"
};

const server = http.createServer((req, res) => {
  let sti = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (sti === "/") sti = "/index.html";

  const fil = path.resolve(ROD, "." + sti);

  // bliv inde i Frontend-mappen
  if (!fil.startsWith(path.resolve(ROD))) {
    res.statusCode = 403;
    res.end("Forbudt");
    return;
  }

  fs.readFile(fil, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end("Ikke fundet: " + sti);
      return;
    }
    res.setHeader("Content-Type", TYPER[path.extname(fil).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");   // saa aendringer slaar igennem ved reload
    res.end(data);
  });
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} er optaget. Proev fx:  node Frontend/serve.js 8081`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`Frontenden ligger paa http://localhost:${PORT}/`);
  console.log("Stop med Ctrl+C");
});
