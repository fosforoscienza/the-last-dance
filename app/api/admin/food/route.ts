import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { PLAYER_COLUMNS, TICKETS, type TicketKey } from "@/lib/types";

const VALID = new Set<string>(TICKETS.map((t) => t.key));

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId ?? "");
  const pick = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter((t) => VALID.has(t)) : []);
  // tickets: da segnare come usati; restore: da rendere di nuovo validi (errore dell'admin)
  const tickets = pick(body.tickets);
  const restore = pick(body.restore);
  if (!playerId || tickets.length + restore.length === 0) {
    return NextResponse.json({ error: "Seleziona almeno un cibo" }, { status: 400 });
  }
  const update: Partial<Record<TicketKey, boolean>> & { updated_at: string } = { updated_at: new Date().toISOString() };
  for (const t of tickets) update[t as TicketKey] = true;
  for (const t of restore) update[t as TicketKey] = false;

  const { data, error } = await supabaseAdmin()
    .from("players")
    .update(update)
    .eq("id", playerId)
    .select(PLAYER_COLUMNS)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  return NextResponse.json({ player: data });
}
