"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PLAYER_COLUMNS, type Player } from "@/lib/types";

export default function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("__all");
  const [flash, setFlash] = useState<Record<string, number>>({});
  const flashTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const sb = supabaseBrowser();
    const load = async () => {
      const { data } = await sb.from("players").select(PLAYER_COLUMNS);
      if (data) setPlayers(data as Player[]);
      setLoading(false);
    };
    const markFlash = (id: string) => {
      setFlash((f) => ({ ...f, [id]: Date.now() }));
      flashTimers.current.push(
        setTimeout(() => setFlash((f) => {
          const n = { ...f };
          delete n[id];
          return n;
        }), 1200)
      );
    };

    const channel = sb
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id: string }).id;
          setPlayers((ps) => ps.filter((p) => p.id !== id));
          return;
        }
        const row = payload.new as Player;
        setPlayers((ps) => {
          const i = ps.findIndex((p) => p.id === row.id);
          if (i === -1) return [...ps, row];
          const copy = ps.slice();
          copy[i] = row;
          return copy;
        });
        markFlash(row.id);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") load();
      });

    load();
    const interval = setInterval(load, 30000);
    const timers = flashTimers.current;
    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
      sb.removeChannel(channel);
    };
  }, []);

  const teams = useMemo(
    () => Array.from(new Set(players.map((p) => p.team).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [players]
  );

  const rows = useMemo(() => {
    if (filter === "__teams") {
      const totals = new Map<string, { points: number; count: number }>();
      for (const p of players) {
        const key = p.team || "Senza squadra";
        const t = totals.get(key) ?? { points: 0, count: 0 };
        t.points += p.points;
        t.count += 1;
        totals.set(key, t);
      }
      return Array.from(totals, ([team, t]) => ({ id: team, title: team, sub: `${t.count} giocatori`, points: t.points }))
        .sort((a, b) => b.points - a.points);
    }
    return players
      .filter((p) => filter === "__all" || p.team === filter)
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((p) => ({ id: p.id, title: p.name, sub: p.team, points: p.points }));
  }, [players, filter]);

  // Pari merito: stessa posizione per stesso punteggio
  let lastPoints = -1;
  let lastRank = 0;

  return (
    <>
      <div className="seg">
        <button className={filter === "__all" ? "active" : ""} onClick={() => setFilter("__all")}>Tutti</button>
        <button className={filter === "__teams" ? "active" : ""} onClick={() => setFilter("__teams")}>Squadre</button>
        {teams.map((t) => (
          <button key={t} className={filter === t ? "active" : ""} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>
      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <p className="muted">Caricamento...</p>
        ) : rows.length === 0 ? (
          <p className="muted">Nessun utente. Caricali dalla sezione Gestione.</p>
        ) : (
          <ol className="board">
            {rows.map((r, i) => {
              if (r.points !== lastPoints) {
                lastRank = i + 1;
                lastPoints = r.points;
              }
              return (
                <li key={r.id} className={flash[r.id] ? "flash" : ""}>
                  <span className="rank">{lastRank}</span>
                  <span className="who">
                    <strong>{r.title}</strong>
                    {r.sub && <span>{r.sub}</span>}
                  </span>
                  <span className="pts">{r.points}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
