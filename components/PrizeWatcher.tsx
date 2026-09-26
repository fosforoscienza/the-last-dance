"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import PrizePopup from "./PrizePopup";

const SEEN_KEY = "tld-prize-seen";

type Winner = { player_id: string; name: string };

function loadSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // localStorage non disponibile: si ricorda solo finché la pagina è aperta
  }
}

// Avvisa l'admin quando un giocatore completa la caccia al tesoro.
// Alla prima apertura i vincitori già presenti non vengono mostrati; poi si ricorda
// quelli già visti, così chi ha vinto mentre l'app era chiusa compare alla riapertura.
export default function PrizeWatcher() {
  // Un popup alla volta; l'id del giocatore fa da chiave, così il suono parte una volta sola
  const [queue, setQueue] = useState<Winner[]>([]);

  useEffect(() => {
    const sb = supabaseBrowser();
    let seen: Set<string> | null = null;
    let chain = Promise.resolve();

    const check = () => {
      chain = chain.then(async () => {
        const { data, error } = await sb.from("treasure_winners").select("player_id,name").order("won_at");
        if (error || !data) return;
        const winners = data as Winner[];
        if (!seen) seen = loadSeen() ?? new Set(winners.map((w) => w.player_id));
        const fresh = winners.filter((w) => !seen!.has(w.player_id));
        fresh.forEach((w) => seen!.add(w.player_id));
        saveSeen(seen);
        if (fresh.length) setQueue((q) => [...q, ...fresh]);
      });
    };

    const channel = sb
      .channel("treasure-winners")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "treasure_winners" }, check)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") check();
      });

    // Rete di sicurezza: riallinea se il telefono va in standby o la connessione cade
    const interval = setInterval(check, 15000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      sb.removeChannel(channel);
    };
  }, []);

  if (!queue.length) return null;
  return (
    <PrizePopup key={queue[0].player_id} onClose={() => setQueue((q) => q.slice(1))}>
      <strong>{queue[0].name}</strong> ha vinto il super premio!
    </PrizePopup>
  );
}
