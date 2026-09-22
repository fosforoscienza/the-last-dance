import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSession } from "@/lib/session";
import { envAdminName, escapeLike, normalizeName, sameName } from "@/lib/util";
import { checkMainPassword } from "@/lib/main-admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = normalizeName(body.username);
  // Le password salvate sono senza spazi iniziali/finali (tastiere del telefono a volte li aggiungono)
  const password = String(body.password ?? "").trim();
  if (!username || !password) {
    return NextResponse.json({ error: "Inserisci nome e password" }, { status: 400 });
  }

  // Admin principale da variabili d'ambiente
  const envUser = envAdminName();
  if (envUser && sameName(username, envUser)) {
    if (await checkMainPassword(password)) {
      await createSession({ role: "admin", name: envUser, credId: "env" });
      return NextResponse.json({ role: "admin" });
    }
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data } = await db
    .from("credentials")
    .select("id,username,password_hash,role,player_id")
    .ilike("username", escapeLike(username))
    .maybeSingle();

  if (!data || !(await bcrypt.compare(password, data.password_hash))) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  if (data.role === "admin") {
    await createSession({ role: "admin", name: data.username, credId: data.id });
  } else {
    if (!data.player_id) return NextResponse.json({ error: "Utente non valido" }, { status: 401 });
    await createSession({ role: "user", name: data.username, playerId: data.player_id });
  }
  return NextResponse.json({ role: data.role });
}
