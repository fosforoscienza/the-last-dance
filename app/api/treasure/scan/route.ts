import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { questionForCode } from "@/lib/treasure-codes";
import { TREASURE_QUESTIONS } from "@/lib/treasure-questions";
import { TREASURE_YEARS, type TreasureQuestion } from "@/lib/treasure";

// Il giocatore ha scansionato un QR: se è della caccia al tesoro restituisce la domanda (senza la soluzione)
export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "user" || !session.playerId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const n = await questionForCode(body.code);
  const def = n ? TREASURE_QUESTIONS[n - 1] : undefined;
  if (!n || !def) return NextResponse.json({ error: "Questo QR code non fa parte della caccia al tesoro" }, { status: 404 });

  const { data } = await supabaseAdmin()
    .from("treasure_found")
    .select("question")
    .eq("player_id", session.playerId)
    .eq("question", n)
    .maybeSingle();
  if (data) return NextResponse.json({ number: n, alreadyFound: true });

  const question: TreasureQuestion = { number: n, year: TREASURE_YEARS[n - 1], text: def.text, answers: [...def.answers] };
  return NextResponse.json({ question });
}
