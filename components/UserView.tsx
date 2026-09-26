"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PLAYER_COLUMNS, TICKETS, type Player } from "@/lib/types";
import FoodIcon from "./FoodIcon";
import Popup from "./Popup";
import LogoutButton from "./LogoutButton";
import Leaderboard from "./Leaderboard";
import SoundToggle from "./SoundToggle";
import Treasure from "./Treasure";
import { installAutoUnlock } from "@/lib/sounds";
import { usePopupQueue } from "@/lib/usePopupQueue";

export default function UserView({ initial, treasureFound }: { initial: Player; treasureFound: number[] }) {
  const [player, setPlayer] = useState<Player>(initial);
  const [bump, setBump] = useState(0);
  const [showBoard, setShowBoard] = useState(false);
  const [showTreasure, setShowTreasure] = useState(false);
  const [found, setFound] = useState<number[]>(treasureFound);
  useEffect(() => installAutoUnlock(), []);
  const last = useRef<Player>(initial);
  const { current, push, done } = usePopupQueue();

  const apply = useCallback(
    (next: Player) => {
      const prev = last.current;
      const delta = next.points - prev.points;
      if (delta !== 0) {
        push({ kind: "points", delta });
        setBump((b) => b + 1);
      }
      if (TICKETS.some((t) => next[t.key] && !prev[t.key])) push({ kind: "food" });
      last.current = next;
      setPlayer(next);
    },
    [push]
  );

  useEffect(() => {
    const sb = supabaseBrowser();
    const refetch = async () => {
      const { data } = await sb.from("players").select(PLAYER_COLUMNS).eq("id", initial.id).maybeSingle();
      if (data) apply(data as Player);
    };

    const channel = sb
      .channel(`player-${initial.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `id=eq.${initial.id}` },
        (payload) => apply(payload.new as Player)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refetch();
      });

    // Rete di sicurezza: riallinea se il telefono va in standby o la connessione cade
    const interval = setInterval(refetch, 15000);
    const onVisible = () => document.visibilityState === "visible" && refetch();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      sb.removeChannel(channel);
    };
  }, [initial.id, apply]);

  return (
    <div className="user">
      <div className="user-head">
        <div>
          <h1 className="title">
            {/* Nomi tipo "nome.cognome": possono andare a capo dopo il punto invece di finire sotto i pulsanti */}
            {player.name.split(/(?<=[._-])/).map((part, i) => (
              <Fragment key={i}>
                {i > 0 && <wbr />}
                {part}
              </Fragment>
            ))}
          </h1>
          {player.team && <span className="team-badge">{player.team}</span>}
        </div>
        <div className="row">
          <SoundToggle />
          <button className="btn btn-ghost btn-small" onClick={() => setShowBoard(true)} aria-label="Classifica">
            🏆
          </button>
          <LogoutButton />
        </div>
      </div>

      <div className="qr-wrap">
        <div className="qr-box">
          <QRCodeSVG value={player.id} size={512} level="M" marginSize={0} fgColor="#3d0810" />
        </div>
      </div>

      <div className="points">
        <div key={bump} className={`points-value ${bump ? "bump" : ""}`}>
          {player.points}
        </div>
        <div className="points-label">punti</div>
      </div>

      <div className="tickets">
        {TICKETS.map((t) => (
          <div key={t.key} className={`ticket ${player[t.key] ? "used" : ""}`}>
            <FoodIcon food={t.food} className="ticket-icon" />
            <span className="ticket-label">{t.label}</span>
          </div>
        ))}
      </div>

      <button className="btn treasure-open" onClick={() => setShowTreasure(true)}>
        🗺️ Caccia al tesoro
      </button>

      {showBoard && (
        <div className="board-overlay">
          <div className="topbar">
            <h2 className="title" style={{ fontSize: "1.3rem" }}>Classifica</h2>
            <button className="btn btn-ghost btn-small" onClick={() => setShowBoard(false)} aria-label="Chiudi">
              ✕
            </button>
          </div>
          <Leaderboard highlightId={player.id} highlightTeam={player.team || undefined} />
        </div>
      )}

      {showTreasure && <Treasure found={found} onFound={setFound} onClose={() => setShowTreasure(false)} />}

      <Popup data={current} onDone={done} />
    </div>
  );
}
