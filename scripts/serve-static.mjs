// 書き出した静的サイト（out/）を GitHub Pages と同じ /kyounofuku/ で確認するための簡易サーバー
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const BASE = "/kyounofuku";
const PORT = Number(process.env.PORT ?? 3100);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2" };

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/") return res.writeHead(302, { Location: `${BASE}/` }).end();
    if (!url.pathname.startsWith(BASE)) return res.writeHead(404).end("not found");
    let p = path.join(ROOT, decodeURIComponent(url.pathname.slice(BASE.length)));
    if (!p.startsWith(ROOT)) return res.writeHead(403).end();
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!fs.existsSync(p)) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      return res.end(fs.readFileSync(path.join(ROOT, "404.html")));
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] ?? "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  })
  .listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/`));
