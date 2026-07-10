// Minimal static file server for the vanilla demo (no dependencies).
//   node vanilla/serve.mjs        -> serves vanilla/example on :4320
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "example");
const PORT = 4320;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    p = normalize(p).replace(/^(\.\.[/\\])+/, "");
    let fsPath = join(ROOT, p);
    let s;
    try { s = await stat(fsPath); } catch { s = null; }
    if (s && s.isDirectory()) fsPath = join(fsPath, "index.html");
    const body = await readFile(fsPath);
    res.writeHead(200, { "Content-Type": TYPES[extname(fsPath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
  }
}).listen(PORT, () => console.log(`vanilla demo on http://localhost:${PORT}`));
