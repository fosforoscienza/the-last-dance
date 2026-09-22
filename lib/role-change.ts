import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import type { AdminKind } from "./roles";

export type RoleTarget = AdminKind | "giocatore";

export const DB_UPDATE_NEEDED =
  "Il database va aggiornato: esegui di nuovo supabase/schema.sql nel SQL Editor di Supabase.";

export function isMissingKindColumn(e: { code?: string; message?: string } | null) {
  return Boolean(e && (e.code === "PGRST204" || e.code === "42703" || e.message?.includes("admin_kind")));
}

// Cambia il ruolo di una credenziale: giocatore <-> admin (cuoco, giostraio, jolly, direttore).
// Diventando admin il giocatore esce dalla classifica (punti e ticket vengono eliminati).
export async function changeRole(credId: string, target: RoleTarget): Promise<{ error?: string }> {
  const db = supabaseAdmin();
  const { data: cred } = await db.from("credentials").select("id,username,role,player_id").eq("id", credId).maybeSingle();
  if (!cred) return { error: "Utente non trovato" };

  if (target === "giocatore") {
    if (cred.role === "user") return {};
    const { data: player, error: pErr } = await db.from("players").insert({ name: cred.username, team: "" }).select("id").single();
    if (pErr || !player) return { error: "Impossibile creare il giocatore (nome già presente in classifica?)" };
    const upd = await db.from("credentials").update({ role: "user", admin_kind: null, player_id: player.id }).eq("id", credId);
    const res = isMissingKindColumn(upd.error)
      ? await db.from("credentials").update({ role: "user", player_id: player.id }).eq("id", credId)
      : upd;
    if (res.error) {
      await db.from("players").delete().eq("id", player.id);
      return { error: "Impossibile cambiare il ruolo" };
    }
    return {};
  }

  const { error } = await db.from("credentials").update({ role: "admin", admin_kind: target, player_id: null }).eq("id", credId);
  if (isMissingKindColumn(error)) return { error: DB_UPDATE_NEEDED };
  if (error) return { error: "Impossibile cambiare il ruolo" };
  if (cred.player_id) await db.from("players").delete().eq("id", cred.player_id);
  return {};
}
