import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { PLAYER_COLUMNS } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "QR code non valido" }, { status: 400 });
  const { data } = await supabaseAdmin().from("players").select(PLAYER_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  return NextResponse.json({ player: data });
}
