import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { questionForCode } from "@/lib/treasure-codes";
import { LETTERS, TREASURE_QUESTIONS } from "@/lib/treasure-questions";
import { TREASURE_TOTAL } from "@/lib/treasure";

// Risposta a una domanda. Serve di nuovo il contenuto del QR: senza averlo scansionato non si risponde.
export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "user" || !session.playerId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const playerId = session.playerId;
  const body = await req.json().catch(() => ({}));
  const n = await questionForCode(body.code);
  const def = n ? TREASURE_QUESTIONS[n - 1] : undefined;
  const answer = Number(body.answer);
  if (!n || !def) return NextResponse.json({ error: "Questo QR code non fa parte della caccia al tesoro" }, { status: 404 });
  if (!Number.isInteger(answer) || answer < 0 || answer >= LETTERS.length) {
    return NextResponse.json({ error: "Scegli una risposta" }, { status: 400 });
  }
  if (LETTERS[answer] !== def.correct) return NextResponse.json({ correct: false });

  const db = supabaseAdmin();
  const { error } = await db
    .from("treasure_found")
    .upsert({ player_id: playerId, question: n }, { onConflict: "player_id,question", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "Impossibile salvare la risposta, riprova" }, { status: 500 });

  const { data: rows } = await db.from("treasure_found").select("question").eq("player_id", playerId);
  const found = (rows ?? []).map((r) => Number(r.question)).sort((a, b) => a - b);
  const won = found.length >= TREASURE_TOTAL;
  if (won) {
    // Gli admin ricevono l'avviso in tempo reale dall'inserimento in treasure_winners
    const { data: player } = await db.from("players").select("name").eq("id", playerId).maybeSingle();
    await db
      .from("treasure_winners")
      .upsert({ player_id: playerId, name: player?.name ?? session.name }, { onConflict: "player_id", ignoreDuplicates: true });
  }
  return NextResponse.json({ correct: true, number: n, found, won });
}
