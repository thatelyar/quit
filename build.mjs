// Builds the installable web app in ./docs from quit.html (the single source of the app).
// Run: node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "docs");
mkdirSync(out, { recursive: true });

/* ---------- index.html ---------- */
let page = readFileSync(join(root, "quit.html"), "utf8");
const take = (re) => { const m = page.match(re); if (m) page = page.replace(m[0], ""); return m ? m[0] : ""; };
take(/<title>.*?<\/title>\n?/);
take(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/);
const fonts = take(/<link rel="stylesheet"[^>]*>\n?/);
const style = take(/<style>[\s\S]*?<\/style>\n?/);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Quit</title>
<meta name="description" content="Quit bad habits. Your goal photo fills with colour for every clean day.">
<meta name="theme-color" content="#0c0a11">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Quit">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts.trim()}
<style>
html{height:100%}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0}
img{max-width:100%}
[hidden]{display:none!important}
</style>
${style.trim()}
</head>
<body>
${page.trim()}
<script>
if ("serviceWorker" in navigator) addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
</script>
</body>
</html>
`;
writeFileSync(join(out, "index.html"), html);

/* ---------- manifest + service worker ---------- */
writeFileSync(join(out, "manifest.webmanifest"), JSON.stringify({
  name: "Quit",
  short_name: "Quit",
  description: "Quit bad habits. Your goal photo fills with colour for every clean day.",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0c0a11",
  theme_color: "#0c0a11",
  icons: [
    { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2) + "\n");

const version = Date.now().toString(36);
writeFileSync(join(out, "sw.js"), `// Offline support: network first, cached copy when offline.
const CACHE = "quit-${version}";
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match("./")))
  );
});
`);
writeFileSync(join(out, ".nojekyll"), "");

/* ---------- icons (drawn here, no image tools needed) ---------- */
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
function png(size, scale) {
  // scale < 1 shrinks the glyph toward the centre (safe zone for maskable icons)
  const SS = 3, raw = Buffer.alloc(size * (size * 4 + 1));
  const bg = [12, 10, 17], fg = [239, 234, 245], ember = [255, 143, 102];
  const sample = (u, v) => {
    const x = (u - 0.5) / scale + 0.5, y = (v - 0.5) / scale + 0.5;
    const dot = Math.hypot(x - 0.79, y - 0.615) < 0.058;
    if (dot) return ember;
    const r = Math.hypot(x - 0.42, y - 0.44);
    const ring = r > 0.125 && r < 0.215;
    const stem = x > 0.545 && x < 0.635 && y > 0.24 && y < 0.82;
    if (ring || stem) return fg;
    // soft glow rising from the bottom, like the photo filling up
    const g = Math.max(0, (v - 0.55) / 0.45) ** 2 * 0.3;
    return [bg[0] + (ember[0] - bg[0]) * g, bg[1] + (ember[1] - bg[1]) * g, bg[2] + (ember[2] - bg[2]) * g];
  };
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1); raw[row] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
        r += c[0]; g += c[1]; b += c[2];
      }
      const o = row + 1 + px * 4, n = SS * SS;
      raw[o] = Math.round(r / n); raw[o + 1] = Math.round(g / n); raw[o + 2] = Math.round(b / n); raw[o + 3] = 255;
    }
  }
  const head = Buffer.alloc(13); head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4); head[8] = 8; head[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
writeFileSync(join(out, "icon-192.png"), png(192, 1));
writeFileSync(join(out, "icon-512.png"), png(512, 1));
writeFileSync(join(out, "icon-maskable-512.png"), png(512, 0.72));
writeFileSync(join(out, "apple-touch-icon.png"), png(180, 0.86));
console.log("Built docs/");
