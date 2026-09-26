import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { TREASURE_TOTAL } from "./treasure";

// Le immagini dei QR della caccia al tesoro stanno in caccia-al-tesoro/qr/ (fuori da public/,
// così nessuno può scaricarle dal sito). Il numero nel nome del file (1.png … 10.png) dice
// quale domanda apre. Il contenuto dei QR può essere qualsiasi cosa: l'app lo legge dalle immagini.
export const QR_DIR = path.join(process.cwd(), "caccia-al-tesoro", "qr");

function decodeImage(file: string, buf: Buffer) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return PNG.sync.read(buf);
  if (ext === ".jpg" || ext === ".jpeg") return jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
  return null;
}

async function loadCodes() {
  const codes = new Map<string, number>();
  let files: string[] = [];
  try {
    files = await readdir(QR_DIR);
  } catch {
    console.warn("[caccia al tesoro] cartella dei QR non trovata:", QR_DIR);
    return codes;
  }
  for (const file of files) {
    const n = Number(file.match(/\d+/)?.[0]);
    if (!Number.isInteger(n) || n < 1 || n > TREASURE_TOTAL) continue;
    try {
      const img = decodeImage(file, await readFile(path.join(QR_DIR, file)));
      if (!img) continue;
      const qr = jsQR(new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.length), img.width, img.height);
      if (qr?.data) codes.set(qr.data.trim(), n);
      else console.warn(`[caccia al tesoro] nessun QR leggibile in ${file}`);
    } catch (e) {
      console.warn(`[caccia al tesoro] impossibile leggere ${file}:`, e);
    }
  }
  return codes;
}

let cache: Promise<Map<string, number>> | null = null;

// Numero della domanda aperta dal QR scansionato, o null se non è un QR della caccia al tesoro
export async function questionForCode(code: unknown): Promise<number | null> {
  const text = String(code ?? "").trim();
  if (!text) return null;
  cache ??= loadCodes();
  return (await cache).get(text) ?? null;
}
