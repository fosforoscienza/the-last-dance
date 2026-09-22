import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { passwordFields, writeWithEncFallback } from "@/lib/password";

// Ogni admin (qualsiasi ruolo) può cambiare la propria password
export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (me.credId === "env") {
    return NextResponse.json(
      { error: "La password dell'admin principale si cambia su Vercel (variabile ADMIN_PASSWORD)" },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const current = String(body.current ?? "").trim();
  const next = String(body.next ?? "").trim();
  if (next.length < 4) return NextResponse.json({ error: "La nuova password deve avere almeno 4 caratteri" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: cred } = await db.from("credentials").select("id,password_hash").eq("id", me.credId).maybeSingle();
  if (!cred) return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
  if (!(await bcrypt.compare(current, cred.password_hash))) {
    return NextResponse.json({ error: "La password attuale non è corretta" }, { status: 400 });
  }
  const { error } = await writeWithEncFallback(await passwordFields(next, 10), (f) =>
    db.from("credentials").update(f).eq("id", cred.id)
  );
  if (error) return NextResponse.json({ error: "Impossibile salvare la password" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
