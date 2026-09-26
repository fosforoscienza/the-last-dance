import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { TREASURE_MAX_ATTEMPTS } from "./treasure";

// Risposte sbagliate date da un giocatore a una domanda (0 se la tabella non esiste ancora)
export async function wrongCount(playerId: string, question: number) {
  const { data } = await supabaseAdmin()
    .from("treasure_wrong")
    .select("wrong")
    .eq("player_id", playerId)
    .eq("question", question)
    .maybeSingle();
  return Number(data?.wrong ?? 0);
}

// Domande che il giocatore ha sbagliato troppe volte: il simbolo è perso
export async function lockedQuestions(playerId: string) {
  const { data } = await supabaseAdmin()
    .from("treasure_wrong")
    .select("question")
    .eq("player_id", playerId)
    .gte("wrong", TREASURE_MAX_ATTEMPTS);
  return (data ?? []).map((r) => Number(r.question));
}

// Registra una risposta sbagliata (in modo atomico) e restituisce quante sono in tutto
export async function addWrong(playerId: string, question: number) {
  const { data, error } = await supabaseAdmin().rpc("treasure_wrong_answer", { p_player: playerId, p_question: question });
  if (error) {
    console.warn("[caccia al tesoro] impossibile salvare la risposta sbagliata:", error.message);
    return null;
  }
  return Number(data);
}
