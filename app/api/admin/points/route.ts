import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId ?? "");
  const delta = Number(body.delta);
  if (!playerId || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000_000) {
    return NextResponse.json({ error: "Valore non valido" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("change_points", { p_id: playerId, p_delta: delta }).single();
  if (error || !data) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  return NextResponse.json({ player: data });
}
