import "server-only";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "./supabase-admin";
import { decryptPassword, encryptPassword } from "./password";

// Password dell'admin principale (super admin).
// All'inizio è ADMIN_PASSWORD di Vercel; quando il super admin la cambia dall'app
// viene salvata (hash + copia cifrata) nella tabella app_settings e da lì in poi vale quella.
const KEY = "main_admin_password";

type Stored = { hash: string; enc: string };

async function readStored(): Promise<Stored | null> {
  const { data, error } = await supabaseAdmin().from("app_settings").select("value").eq("key", KEY).maybeSingle();
  if (error || !data) return null;
  try {
    const v = JSON.parse(data.value);
    return typeof v.hash === "string" ? v : null;
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function envMainPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || null;
}

export async function checkMainPassword(password: string) {
  const stored = await readStored();
  if (stored) return bcrypt.compare(password, stored.hash);
  const env = envMainPassword();
  return env !== null && safeEqual(password, env);
}

// Password leggibile da mostrare in Gestione
export async function readMainPassword() {
  const stored = await readStored();
  if (stored) return decryptPassword(stored.enc);
  return envMainPassword();
}

export async function setMainPassword(password: string): Promise<{ error?: string }> {
  const value = JSON.stringify({ hash: await bcrypt.hash(password, 10), enc: encryptPassword(password) });
  const { error } = await supabaseAdmin()
    .from("app_settings")
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() });
  if (error) {
    return {
      error: "Il database va aggiornato: esegui di nuovo supabase/schema.sql nel SQL Editor di Supabase.",
    };
  }
  return {};
}
