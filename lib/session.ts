import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { supabaseAdmin } from "./supabase-admin";
import { can, toAdminKind, type AdminKind, type Permission } from "./roles";
import { escapeLike, isEnvAdminName } from "./util";

const COOKIE = "tld_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 giorni

export type Session = {
  role: "user" | "admin";
  name: string;
  playerId?: string;
  // Admin: id della credenziale ("env" per l'admin principale definito su Vercel)
  credId?: string;
};

export type AdminSession = Session & { role: "admin"; kind: AdminKind; credId: string };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET mancante o troppo corto");
  return new TextEncoder().encode(s);
}

export async function createSession(session: Session) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "user" && payload.role !== "admin") return null;
    return {
      role: payload.role,
      name: String(payload.name ?? ""),
      playerId: typeof payload.playerId === "string" ? payload.playerId : undefined,
      credId: typeof payload.credId === "string" ? payload.credId : undefined,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// Verifica che la sessione sia di un admin ancora valido e ne legge il ruolo attuale dal database,
// così i cambi di ruolo hanno effetto subito. Con `perm` controlla anche il permesso richiesto.
export async function requireAdmin(perm?: Permission): Promise<AdminSession | null> {
  const s = await getSession();
  if (s?.role !== "admin") return null;

  let result: AdminSession | null = null;
  if (s.credId === "env" || (!s.credId && isEnvAdminName(s.name))) {
    result = { ...s, role: "admin", credId: "env", kind: "direttore" };
  } else {
    const db = supabaseAdmin();
    const find = async (cols: string) => {
      const q = db.from("credentials").select(cols);
      const { data, error } = await (s.credId ? q.eq("id", s.credId) : q.ilike("username", escapeLike(s.name))).maybeSingle();
      return { data: data as unknown as { id: string; username: string; role: string; admin_kind?: string | null } | null, error };
    };
    let { data: row, error } = await find("id,username,role,admin_kind");
    if (error) row = (await find("id,username,role")).data;
    if (row && row.role === "admin") {
      result = { ...s, role: "admin", name: row.username, credId: row.id, kind: toAdminKind(row.admin_kind) };
    }
  }
  if (!result) return null;
  if (perm && !can(result.kind, perm)) return null;
  return result;
}
