import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { escapeLike, normalizeName } from "@/lib/util";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { data } = await supabaseAdmin().from("credentials").select("id,username").eq("role", "admin").order("username");
  return NextResponse.json({ admins: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const username = normalizeName(body.username);
  const password = String(body.password ?? "");
  if (!username || password.length < 4) {
    return NextResponse.json({ error: "Nome obbligatorio e password di almeno 4 caratteri" }, { status: 400 });
  }
  if (process.env.ADMIN_USERNAME && username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase()) {
    return NextResponse.json({ error: "Nome già in uso" }, { status: 409 });
  }
  const db = supabaseAdmin();
  const { data: existing } = await db.from("credentials").select("id").ilike("username", escapeLike(username)).maybeSingle();
  if (existing) return NextResponse.json({ error: "Nome già in uso" }, { status: 409 });
  const { error } = await db
    .from("credentials")
    .insert({ username, password_hash: await bcrypt.hash(password, 10), role: "admin" });
  if (error) return NextResponse.json({ error: "Impossibile creare l'admin" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id mancante" }, { status: 400 });
  await supabaseAdmin().from("credentials").delete().eq("id", id).eq("role", "admin");
  return NextResponse.json({ ok: true });
}
