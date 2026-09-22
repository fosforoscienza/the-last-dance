import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";

// Elimina un singolo utente (?id=...) oppure tutti gli utenti (?all=1)
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const db = supabaseAdmin();
  const id = searchParams.get("id");
  if (id) {
    await db.from("players").delete().eq("id", id);
  } else if (searchParams.get("all") === "1") {
    await db.from("players").delete().not("id", "is", null);
  } else {
    return NextResponse.json({ error: "Parametro mancante" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
