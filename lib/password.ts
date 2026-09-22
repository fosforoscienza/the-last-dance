import "server-only";
import bcrypt from "bcryptjs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Copia cifrata (AES-256-GCM) della password, leggibile solo dal server,
// per permettere all'admin di vederla. Il login usa sempre l'hash bcrypt.
function key() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET mancante");
  return createHash("sha256").update(`tld-password:${s}`).digest();
}

export function encryptPassword(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decryptPassword(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    const [iv, tag, data] = enc.split(".").map((p) => Buffer.from(p, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export async function passwordFields(plain: string, cost = 8) {
  return { password_hash: await bcrypt.hash(plain, cost), password_enc: encryptPassword(plain) };
}

type Result = { error: { code?: string; message?: string } | null };

// Se la colonna password_enc non esiste ancora (schema non aggiornato) riprova senza.
export async function writeWithEncFallback<T extends { password_enc?: string }>(
  fields: T,
  write: (f: Omit<T, "password_enc"> | T) => PromiseLike<Result>
) {
  const res = await write(fields);
  const e = res.error;
  if (e && (e.code === "PGRST204" || e.code === "42703" || e.message?.includes("password_enc"))) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_enc, ...rest } = fields;
    return write(rest);
  }
  return res;
}
