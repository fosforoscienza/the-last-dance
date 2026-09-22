import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { escapeLike, normalizeName } from "@/lib/util";

type Row = { name: string; password: string; team: string };

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
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
    const team = normalizeName(raw.team);
    if (!name || !password) {
      errors.push(`Riga senza nome o password${name ? `: ${name}` : ""}`);
      continue;
    }
    if (process.env.ADMIN_USERNAME && name.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase()) {
      errors.push(`${name}: nome riservato all'admin`);
      continue;
    }
    const hash = await bcrypt.hash(password, 8);

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
      await db.from("credentials").update({ password_hash: hash }).eq("id", existing.id);
      await db.from("players").update({ team, name }).eq("id", existing.player_id);
      updated++;
      continue;
    }

    const { data: player, error: pErr } = await db.from("players").insert({ name, team }).select("id").single();
    if (pErr || !player) {
      errors.push(`${name}: impossibile creare l'utente`);
      continue;
    }
    const { error: cErr } = await db
      .from("credentials")
      .insert({ username: name, password_hash: hash, role: "user", player_id: player.id });
    if (cErr) {
      await db.from("players").delete().eq("id", player.id);
      errors.push(`${name}: impossibile salvare la password`);
      continue;
    }
    created++;
  }

  return NextResponse.json({ created, updated, errors });
}
