import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { escapeLike, isEnvAdminName, normalizeName } from "@/lib/util";
import { passwordFields, writeWithEncFallback } from "@/lib/password";

type Row = { name: string; password: string; team?: string };

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await requireAdmin("manage"))) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const rows: Row[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0 || rows.length > 200) {
    return NextResponse.json({ error: "Nessuna riga valida" }, { status: 400 });
  }

  const db = supabaseAdmin();
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const raw of rows) {
    const name = normalizeName(raw.name);
    const password = String(raw.password ?? "").trim();
    // Squadra solo se presente nel file: altrimenti quella esistente non viene toccata
    const team = raw.team === undefined ? undefined : normalizeName(raw.team);
    if (!name || !password) {
      errors.push(`Riga senza nome o password${name ? `: ${name}` : ""}`);
      continue;
    }
    if (isEnvAdminName(name)) {
      errors.push(`${name}: nome riservato all'admin`);
      continue;
    }
    const pw = await passwordFields(password);

    const { data: existing } = await db
      .from("credentials")
      .select("id,role,player_id")
      .ilike("username", escapeLike(name))
      .maybeSingle();

    if (existing) {
      if (existing.role !== "user" || !existing.player_id) {
        errors.push(`${name}: nome già usato da un admin`);
        continue;
      }
      await writeWithEncFallback(pw, (f) => db.from("credentials").update(f).eq("id", existing.id));
      await db.from("players").update(team === undefined ? { name } : { name, team }).eq("id", existing.player_id);
      updated++;
      continue;
    }

    const { data: player, error: pErr } = await db.from("players").insert({ name, team: team ?? "" }).select("id").single();
    if (pErr || !player) {
      errors.push(`${name}: impossibile creare l'utente`);
      continue;
    }
    const { error: cErr } = await writeWithEncFallback({ ...pw, username: name, role: "user", player_id: player.id }, (f) =>
      db.from("credentials").insert(f)
    );
    if (cErr) {
      await db.from("players").delete().eq("id", player.id);
      errors.push(`${name}: impossibile salvare la password`);
      continue;
    }
    created++;
  }

  return NextResponse.json({ created, updated, errors });
}
