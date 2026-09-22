import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAYER_COLUMNS, type Player } from "@/lib/types";
import UserView from "@/components/UserView";

export const dynamic = "force-dynamic";

export default async function UserPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role === "admin") redirect("/admin");
  const { data } = await supabaseAdmin().from("players").select(PLAYER_COLUMNS).eq("id", session.playerId!).maybeSingle();
  if (!data) redirect("/api/logout-redirect");
  return <UserView initial={data as Player} />;
}
