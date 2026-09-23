"use client";

import { useCallback, useEffect, useState } from "react";
import Scanner from "./Scanner";
import ManualSearch from "./ManualSearch";
import FoodIcon from "./FoodIcon";
import Popup from "./Popup";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { usePopupQueue } from "@/lib/usePopupQueue";
import { TICKETS, type Player, type TicketKey } from "@/lib/types";

type Mode = "scan" | "loading" | "player" | "points" | "food";

const MAX_DIGITS = 7;
// Pulsanti rapidi per i punti
const QUICK_AMOUNTS = [100, 200, 300, -100];

export default function ScanFlow({
  canPoints,
  canFood,
  visible = true,
}: {
  canPoints: boolean;
  canFood: boolean;
  visible?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("scan");
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState("");
  const { current, push, done } = usePopupQueue();

  const backToScanner = useCallback(() => {
    setPlayer(null);
    setError("");
    setMode("scan");
  }, []);

  const onScan = useCallback(async (value: string) => {
    setMode("loading");
    setError("");
    try {
      const res = await fetch(`/api/admin/player/${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Utente non trovato");
      setPlayer(data.player);
      // Con un solo permesso si va diretti alla schermata giusta
      setMode(canPoints && canFood ? "player" : canPoints ? "points" : "food");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setMode("scan");
    }
  }, [canPoints, canFood]);

  // Aggiornamenti live del giocatore aperto (es. altro admin che assegna punti)
  const playerId = player?.id;
  useEffect(() => {
    if (!playerId) return;
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`admin-player-${playerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `id=eq.${playerId}` },
        (payload) => setPlayer(payload.new as Player)
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [playerId]);

  const scanning = mode === "scan" || mode === "loading" || !player;

  return (
    <>
      {/* Lo scanner resta sempre montato: la fotocamera non viene richiesta di nuovo */}
      <Scanner active={visible && mode === "scan"} onScan={onScan} />
      {scanning ? (
        <>
          {error && <p className="error" style={{ textAlign: "center" }}>{error}</p>}
          {mode === "loading" ? (
            <div className="scanner" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="title">Carico...</span>
            </div>
          ) : (
            <ManualSearch onPick={onScan} />
          )}
          <Popup data={current} onDone={done} />
        </>
      ) : (
        renderPlayerView()
      )}
    </>
  );

  function renderPlayerView() {
    if (!player) return null;
    return (
    <div className={`player-view ${mode === "player" ? "" : "compact"}`}>
      <div className="corner-row">
        <button className="btn btn-ghost btn-small" onClick={backToScanner}>
          ← Scanner
        </button>
        {mode === "points" && canFood && (
          <button className="btn btn-ghost btn-small" onClick={() => setMode("food")}>
            Cibo →
          </button>
        )}
        {mode === "food" && canPoints && (
          <button className="btn btn-ghost btn-small" onClick={() => setMode("points")}>
            Punti →
          </button>
        )}
        {(mode === "player" || !(canPoints && canFood)) && <span />}
      </div>

      <div className="player-info">
        <h2 className="title">{player.name}</h2>
        {player.team && <span className="team-badge">{player.team}</span>}
        <div className="player-points">{player.points} <small style={{ fontSize: "0.4em" }}>PUNTI</small></div>
      </div>

      {mode === "player" && (
        <div className="big-actions" style={canPoints && canFood ? undefined : { gridTemplateRows: "1fr" }}>
          {canPoints && (
            <button className="big-btn big-btn-points" onClick={() => setMode("points")}>
              ★ Assegna punti
            </button>
          )}
          {canFood && (
            <button className="big-btn big-btn-food" onClick={() => setMode("food")}>
              <FoodIcon food="hotdog" /> Cibo
            </button>
          )}
        </div>
      )}

      {mode === "points" && canPoints && (
        <PointsPad
          player={player}
          onDone={(updated, requested, before) => {
            const applied = updated.points - before;
            setPlayer(updated);
            if (applied !== 0) push({ kind: "points", delta: applied });
            else if (requested < 0) push({ kind: "info", text: "Punteggio già a zero" });
            setMode("player");
          }}
        />
      )}

      {mode === "food" && canFood && (
        <FoodPicker
          player={player}
          onRestored={setPlayer}
          onDone={(updated) => {
            setPlayer(updated);
            push({ kind: "food" });
            setMode("player");
          }}
        />
      )}

      <Popup data={current} onDone={done} />
    </div>
    );
  }
}

function PointsPad({ player, onDone }: { player: Player; onDone: (p: Player, requested: number, before: number) => void }) {
  // Di default i pulsanti rapidi; "Altro importo" apre il tastierino
  const [custom, setCustom] = useState(false);
  const [sign, setSign] = useState<1 | -1>(1);
  const [digits, setDigits] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const value = Number(digits || "0");

  const press = (d: string) => {
    setError("");
    setDigits((cur) => {
      if (cur.length >= MAX_DIGITS) return cur;
      if (cur === "0") return d;
      return cur + d;
    });
  };

  async function confirm() {
    if (value <= 0) {
      setError("Digita un numero");
      return;
    }
    await send(sign * value);
  }

  async function send(delta: number) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const before = player.points;
      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      onDone(data.player, delta, before);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setBusy(false);
    }
  }

  if (!custom) {
    return (
      <>
        {error && <p className="error">{error}</p>}
        <div className="quick-pad">
          {QUICK_AMOUNTS.map((n) => (
            <button key={n} className={n > 0 ? "quick-plus" : "quick-minus"} disabled={busy} onClick={() => send(n)}>
              {n > 0 ? `+${n}` : `−${Math.abs(n)}`}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" style={{ flexShrink: 0 }} disabled={busy} onClick={() => setCustom(true)}>
          ⌨ Altro importo
        </button>
      </>
    );
  }

  return (
    <>
      <button className="manual-link" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => setCustom(false)}>
        ← Pulsanti rapidi
      </button>
      <div className="pad-display">
        <div className="sign-toggle">
          <button className={sign === 1 ? "on-plus" : ""} onClick={() => setSign(1)} aria-label="Aggiungi">
            +
          </button>
          <button className={sign === -1 ? "on-minus" : ""} onClick={() => setSign(-1)} aria-label="Togli">
            −
          </button>
        </div>
        <div className={`pad-value ${sign === 1 ? "plus" : "minus"}`}>
          {sign === 1 ? "+" : "−"}
          {digits || "0"}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button className="pad-muted" onClick={() => setDigits((c) => c.slice(0, -1))} aria-label="Cancella">
          ⌫
        </button>
        <button onClick={() => press("0")}>0</button>
        <button className="pad-muted" onClick={() => setDigits("")}>
          C
        </button>
      </div>
      <button
        className="btn"
        style={{ background: sign === 1 ? "var(--green)" : "var(--red)", color: "#fff", flexShrink: 0, padding: "14px" }}
        disabled={busy || value <= 0}
        onClick={confirm}
      >
        {busy ? "..." : sign === 1 ? `Conferma +${value}` : `Conferma −${value}`}
      </button>
    </>
  );
}

function FoodPicker({
  player,
  onDone,
  onRestored,
}: {
  player: Player;
  onDone: (p: Player) => void;
  onRestored: (p: Player) => void;
}) {
  const [selected, setSelected] = useState<TicketKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (k: TicketKey) =>
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, tickets: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      onDone(data.player);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setBusy(false);
    }
  }

  async function restore(key: TicketKey, label: string) {
    if (!window.confirm(`Il ticket "${label}" è già stato usato.\nVuoi renderlo di nuovo valido?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, restore: [key] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      onRestored(data.player);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    }
    setBusy(false);
  }

  const allUsed = TICKETS.every((t) => player[t.key]);

  return (
    <>
      <div className="food-grid">
        {TICKETS.map((t, i) => {
          const used = player[t.key];
          const label = t.food === "hotdog" ? `Hot dog ${i + 1}` : t.label;
          return (
            <button
              key={t.key}
              className={`food-option ${used ? "used" : ""} ${selected.includes(t.key) ? "selected" : ""}`}
              disabled={busy}
              onClick={() => (used ? restore(t.key, label) : toggle(t.key))}
            >
              <FoodIcon food={t.food} />
              <span>{label}</span>
              {used && <small className="food-used">Usato · tocca per ripristinare</small>}
            </button>
          );
        })}
      </div>
      {error && <p className="error">{error}</p>}
      <button
        className="btn btn-gold"
        style={{ flexShrink: 0, padding: "14px" }}
        disabled={busy || selected.length === 0}
        onClick={confirm}
      >
        {busy ? "..." : allUsed ? "Tutti i ticket usati" : "Conferma"}
      </button>
    </>
  );
}
