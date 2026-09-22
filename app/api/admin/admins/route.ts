import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { envAdminName, escapeLike, isEnvAdminName, normalizeName, sameName } from "@/lib/util";
import { decryptPassword, passwordFields, writeWithEncFallback } from "@/lib/password";

type Cred = { id: string; username: string; password_enc?: string | null };

async function listAdmins(): Promise<Cred[]> {
  const db = supabaseAdmin();
  const withEnc = await db.from("credentials").select("id,username,password_enc").eq("role", "admin").order("username");
  if (!withEnc.error) return withEnc.data ?? [];
  const plain = await db.from("credentials").select("id,username").eq("role", "admin").order("username");
  return plain.data ?? [];
}

async function nameTaken(name: string, exceptId?: string) {
  if (isEnvAdminName(name)) return true;
  const { data } = await supabaseAdmin().from("credentials").select("id").ilike("username", escapeLike(name)).maybeSingle();
  return Boolean(data && data.id !== exceptId);
}

// Elenco admin con password leggibili (l'admin principale arriva dalle variabili di Vercel)
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const envName = envAdminName();
  const main = envName ? { id: "env", username: envName, password: process.env.ADMIN_PASSWORD?.trim() ?? null, main: true } : null;
  const others = (await listAdmins()).map((a) => ({
    id: a.id,
    username: a.username,
    password: decryptPassword(a.password_enc),
    main: false,
  }));
  return NextResponse.json({ admins: main ? [main, ...others] : others });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const username = normalizeName(body.username);
  const password = String(body.password ?? "").trim();
  if (!username || password.length < 4) {
    return NextResponse.json({ error: "Nome obbligatorio e password di almeno 4 caratteri" }, { status: 400 });
  }
  if (await nameTaken(username)) return NextResponse.json({ error: "Nome già in uso" }, { status: 409 });
  const db = supabaseAdmin();
  const { error } = await writeWithEncFallback({ ...(await passwordFields(password, 10)), username, role: "admin" }, (f) =>
    db.from("credentials").insert(f)
  );
  if (error) return NextResponse.json({ error: "Impossibile creare l'admin" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Modifica nome e/o password di un admin (non quello principale, che si cambia su Vercel)
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id === "env") return NextResponse.json({ error: "L'admin principale si modifica su Vercel" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  const { data: current } = await db.from("credentials").select("id,username").eq("id", id).eq("role", "admin").maybeSingle();
  if (!current) return NextResponse.json({ error: "Admin non trovato" }, { status: 404 });

  const update: { username?: string; password_hash?: string; password_enc?: string } = {};
  if (body.username !== undefined) {
    const username = normalizeName(body.username);
    if (!username) return NextResponse.json({ error: "Il nome non può essere vuoto" }, { status: 400 });
    if (!sameName(username, current.username) && (await nameTaken(username, id))) {
      return NextResponse.json({ error: "Nome già in uso" }, { status: 409 });
    }
    update.username = username;
  }
  if (body.password !== undefined) {
    const password = String(body.password).trim();
    if (password.length < 4) return NextResponse.json({ error: "Password di almeno 4 caratteri" }, { status: 400 });
    Object.assign(update, await passwordFields(password, 10));
  }
  if (!Object.keys(update).length) return NextResponse.json({ ok: true });
  const { error } = await writeWithEncFallback(update, (f) => db.from("credentials").update(f).eq("id", id));
  if (error) return NextResponse.json({ error: "Impossibile salvare" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id || id === "env") return NextResponse.json({ error: "id non valido" }, { status: 400 });
  await supabaseAdmin().from("credentials").delete().eq("id", id).eq("role", "admin");
  return NextResponse.json({ ok: true });
}
