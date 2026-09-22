"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";

type Props = { playerId: string; teams: string[]; onClose: () => void; onSaved: () => void; onDelete: (p: Player) => void };

export default function EditUser({ playerId, teams, onClose, onSaved, onDelete }: Props) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/users/${playerId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Errore" });
        return;
      }
      setPlayer(data.player);
      setName(data.player.name);
      setTeam(data.player.team);
      setSavedPassword(data.password);
      setPassword(data.password ?? "");
    })();
  }, [playerId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!player) return;
    const body: Record<string, string> = {};
    if (name.trim() !== player.name) body.name = name;
    if (team.trim() !== player.team) body.team = team;
    if (password.trim() && password !== savedPassword) body.password = password;
    if (!Object.keys(body).length) {
      setMsg({ ok: true, text: "Nessuna modifica" });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/users/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Errore" });
      return;
    }
    setPlayer(data.player);
    setName(data.player.name);
    setTeam(data.player.team);
    setSavedPassword(data.password);
    setPassword(data.password ?? password);
    setMsg({ ok: true, text: "Salvato" });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="topbar">
          <h3 className="title" style={{ fontSize: "1.1rem" }}>Modifica utente</h3>
          <button className="btn btn-ghost btn-small" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>

        {!player ? (
          msg ? <p className="error">{msg.text}</p> : <p className="muted">Caricamento...</p>
        ) : (
          <form className="section" onSubmit={save}>
            <p className="muted" style={{ margin: 0 }}>
              {player.points} punti
            </p>
            <label className="field">
              <span>Nome utente</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="words" />
            </label>
            <label className="field">
              <span>Password</span>
              <div className="row">
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder={savedPassword === null ? "Non disponibile: scrivine una nuova" : ""}
                  onChange={(e) => setPassword(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? "Nascondi" : "Mostra"}
                </button>
              </div>
              {savedPassword === null && (
                <small className="muted">
                  Utente creato prima di questa funzione: la password attuale non si può leggere, ma puoi impostarne una nuova.
                </small>
              )}
            </label>
            <label className="field">
              <span>Squadra</span>
              <input className="input" list="edit-teams" value={team} onChange={(e) => setTeam(e.target.value)} />
              <datalist id="edit-teams">
                {teams.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            {msg && (
              <p className={msg.ok ? "" : "error"} style={{ margin: 0, fontWeight: 900 }}>
                {msg.text}
              </p>
            )}
            <button className="btn btn-gold" disabled={busy}>
              {busy ? "Salvo..." : "Salva modifiche"}
            </button>
            <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(player)}>
              Elimina utente
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
