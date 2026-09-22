import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";

// Elimina un singolo utente (?id=...), più utenti (body JSON { ids: [...] }) oppure tutti (?all=1)
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const db = supabaseAdmin();
  const id = searchParams.get("id");
  if (id) {
    await db.from("players").delete().eq("id", id);
  } else if (searchParams.get("ids") === "1") {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    if (ids.length === 0) return NextResponse.json({ error: "Nessun utente selezionato" }, { status: 400 });
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await db.from("players").delete().in("id", ids.slice(i, i + 200));
      if (error) return NextResponse.json({ error: "Impossibile eliminare gli utenti" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted: ids.length });
  } else if (searchParams.get("all") === "1") {
    await db.from("players").delete().not("id", "is", null);
  } else {
    return NextResponse.json({ error: "Parametro mancante" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
