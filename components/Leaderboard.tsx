"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PLAYER_COLUMNS, type Player } from "@/lib/types";

// highlightId: evidenzia il giocatore (e la sua squadra) nella vista dell'utente
export default function Leaderboard({ highlightId, highlightTeam }: { highlightId?: string; highlightTeam?: string } = {}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"players" | "teams">("players");
  // Classifica squadre: per punteggio totale oppure per media sui giocatori
  const [teamSort, setTeamSort] = useState<"total" | "average">("total");
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

  // points: valore usato per ordinare (totale, media o punti del giocatore); label: come mostrarlo
  type BoardRow = { id: string; title: string; sub: string; points: number; label: string; flash: boolean };

  const rows = useMemo<BoardRow[]>(() => {
    if (view === "teams") {
      const totals = new Map<string, { points: number; count: number; flash: boolean }>();
      for (const p of players) {
        const key = p.team || "Senza squadra";
        const t = totals.get(key) ?? { points: 0, count: 0, flash: false };
        t.points += p.points;
        t.count += 1;
        t.flash ||= Boolean(flash[p.id]);
        totals.set(key, t);
      }
      return Array.from(totals, ([team, t]) => {
        const avg = Math.round((t.points / t.count) * 10) / 10;
        const players = `${t.count} ${t.count === 1 ? "giocatore" : "giocatori"}`;
        return teamSort === "average"
          ? { id: `team:${team}`, title: team, sub: `${players} · totale ${t.points}`, points: avg, label: formatNum(avg), flash: t.flash }
          : { id: `team:${team}`, title: team, sub: `${players} · media ${formatNum(avg)}`, points: t.points, label: String(t.points), flash: t.flash };
      }).sort((a, b) => b.points - a.points || a.title.localeCompare(b.title));
    }
    return players
      .filter((p) => filter === "__all" || p.team === filter)
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((p) => ({ id: p.id, title: p.name, sub: p.team, points: p.points, label: String(p.points), flash: Boolean(flash[p.id]) }));
  }, [players, filter, view, flash, teamSort]);

  const maxPoints = Math.max(1, ...rows.map((r) => r.points));

  // Pari merito: stessa posizione per stesso punteggio
  let lastPoints = -1;
  let lastRank = 0;

  return (
    <>
      <div className="view-toggle">
        <button className={view === "players" ? "active" : ""} onClick={() => setView("players")}>
          Giocatori
        </button>
        <button className={view === "teams" ? "active" : ""} onClick={() => setView("teams")}>
          Squadre
        </button>
      </div>
      {view === "teams" && (
        <div className="seg">
          <button className={teamSort === "total" ? "active" : ""} onClick={() => setTeamSort("total")}>
            Punteggio totale
          </button>
          <button className={teamSort === "average" ? "active" : ""} onClick={() => setTeamSort("average")}>
            Media per giocatore
          </button>
        </div>
      )}
      {view === "players" && teams.length > 0 && (
        <div className="seg">
          <button className={filter === "__all" ? "active" : ""} onClick={() => setFilter("__all")}>Tutti</button>
          {teams.map((t) => (
            <button key={t} className={filter === t ? "active" : ""} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
      )}
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
                <li
                  key={r.id}
                  className={`${r.flash ? "flash" : ""} ${r.id === highlightId || (highlightTeam && r.id === `team:${highlightTeam}`) ? "me" : ""}`}
                >
                  <span className={`rank rank-${lastRank}`}>{lastRank}</span>
                  <span className="who">
                    <strong>{r.title}</strong>
                    {r.sub && <span>{r.sub}</span>}
                  </span>
                  <span className="pts">
                    {r.label}
                    {view === "teams" && teamSort === "average" && <small className="pts-unit">media</small>}
                  </span>
                  {view === "teams" && (
                    <span className="team-bar">
                      <span style={{ width: `${(r.points / maxPoints) * 100}%` }} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

// 12.5 -> "12,5", 12 -> "12"
function formatNum(n: number) {
  return n.toLocaleString("it-IT", { maximumFractionDigits: 1 });
}
