import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAYER_COLUMNS, type Player } from "@/lib/types";
import UserView from "@/components/UserView";
import { lockedQuestions } from "@/lib/treasure-db";

export const dynamic = "force-dynamic";

export default async function UserPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role === "admin") redirect("/admin");
  const { data } = await supabaseAdmin().from("players").select(PLAYER_COLUMNS).eq("id", session.playerId!).maybeSingle();
  if (!data) redirect("/api/logout-redirect");
  // Simboli già trovati nella caccia al tesoro (vuoto se la tabella non esiste ancora)
  const { data: found } = await supabaseAdmin().from("treasure_found").select("question").eq("player_id", session.playerId!);
  const treasureFound = (found ?? []).map((r) => Number(r.question));
  const treasureLocked = await lockedQuestions(session.playerId!);
  return <UserView initial={data as Player} treasureFound={treasureFound} treasureLocked={treasureLocked} />;
}
