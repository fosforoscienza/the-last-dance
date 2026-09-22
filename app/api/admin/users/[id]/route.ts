import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { escapeLike, isEnvAdminName, normalizeName, sameName } from "@/lib/util";
import { decryptPassword, passwordFields, writeWithEncFallback } from "@/lib/password";
import { PLAYER_COLUMNS } from "@/lib/types";
import { isAdminKind } from "@/lib/roles";
import { changeRole } from "@/lib/role-change";

type Ctx = { params: Promise<{ id: string }> };

async function loadCredential(playerId: string) {
  const db = supabaseAdmin();
  const withEnc = await db.from("credentials").select("id,username,password_enc").eq("player_id", playerId).maybeSingle();
  if (!withEnc.error) return withEnc.data as { id: string; username: string; password_enc: string | null } | null;
  const plain = await db.from("credentials").select("id,username").eq("player_id", playerId).maybeSingle();
  return plain.data ? { ...plain.data, password_enc: null } : null;
}

// Dettagli di un utente, password compresa (se disponibile)
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await requireAdmin("manage"))) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { id } = await params;
  const { data: player } = await supabaseAdmin().from("players").select(PLAYER_COLUMNS).eq("id", id).maybeSingle();
  if (!player) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  const cred = await loadCredential(id);
  return NextResponse.json({ player, password: decryptPassword(cred?.password_enc) });
}

// Modifica nome, password e squadra
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await requireAdmin("manage"))) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  const cred = await loadCredential(id);
  if (!cred) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const playerUpdate: { name?: string; team?: string; updated_at?: string } = {};
  const credUpdate: { username?: string; password_hash?: string; password_enc?: string } = {};

  if (body.name !== undefined) {
    const name = normalizeName(body.name);
    if (!name) return NextResponse.json({ error: "Il nome non può essere vuoto" }, { status: 400 });
    if (!sameName(name, cred.username)) {
      if (isEnvAdminName(name)) {
        return NextResponse.json({ error: "Nome già in uso" }, { status: 409 });
      }
      const { data: clash } = await db.from("credentials").select("id").ilike("username", escapeLike(name)).maybeSingle();
      if (clash && clash.id !== cred.id) return NextResponse.json({ error: "Nome già in uso" }, { status: 409 });
    }
    playerUpdate.name = name;
    credUpdate.username = name;
  }
  if (body.team !== undefined) playerUpdate.team = normalizeName(body.team);
  if (body.password !== undefined) {
    const password = String(body.password).trim();
    if (!password) return NextResponse.json({ error: "La password non può essere vuota" }, { status: 400 });
    Object.assign(credUpdate, await passwordFields(password));
  }

  if (Object.keys(credUpdate).length) {
    const { error } = await writeWithEncFallback(credUpdate, (f) => db.from("credentials").update(f).eq("id", cred.id));
    if (error) return NextResponse.json({ error: "Impossibile salvare le credenziali" }, { status: 500 });
  }
  if (Object.keys(playerUpdate).length) {
    playerUpdate.updated_at = new Date().toISOString();
    const { error } = await db.from("players").update(playerUpdate).eq("id", id);
    if (error) return NextResponse.json({ error: "Impossibile salvare l'utente" }, { status: 500 });
  }

  // Promozione a admin: il giocatore esce dalla classifica
  if (body.role !== undefined && body.role !== "giocatore") {
    if (!isAdminKind(body.role)) return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
    const res = await changeRole(cred.id, body.role);
    if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
    return NextResponse.json({ promoted: true });
  }

  const { data: player } = await db.from("players").select(PLAYER_COLUMNS).eq("id", id).maybeSingle();
  const fresh = await loadCredential(id);
  return NextResponse.json({ player, password: decryptPassword(fresh?.password_enc) });
}
