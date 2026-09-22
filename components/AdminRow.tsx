"use client";

import { useState } from "react";
import RolePicker, { type RoleValue } from "./RolePicker";
import { kindLabel, type AdminKind } from "@/lib/roles";

export type AdminInfo = { id: string; username: string; password: string | null; kind: AdminKind; main: boolean };

export default function AdminRow({
  admin,
  isMe,
  onChanged,
  onRemove,
}: {
  admin: AdminInfo;
  isMe: boolean;
  onChanged: () => void;
  onRemove: (a: AdminInfo) => void;
}) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(admin.username);
  const [password, setPassword] = useState(admin.password ?? "");
  const [role, setRole] = useState<RoleValue>(admin.kind);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, string> = {};
    if (name.trim() !== admin.username) body.username = name;
    if (password.trim() && password !== admin.password) body.password = password;
    if (role !== admin.kind) {
      if (
        role === "giocatore" &&
        !confirm(`${admin.username} diventerà un giocatore: avrà QR code, punti e ticket e non sarà più admin. Continuare?`)
      )
        return;
      body.role = role;
    }
    if (!Object.keys(body).length) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/admin/admins?id=${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Errore");
      return;
    }
    setEditing(false);
    onChanged();
  }

  if (editing) {
    return (
      <form className="admin-row section" onSubmit={save}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome admin" />
        <input
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={admin.password === null ? "Nuova password" : "Password"}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {isMe ? (
          <small className="muted">Non puoi cambiare il tuo ruolo.</small>
        ) : (
          <RolePicker value={role} onChange={setRole} withPlayer />
        )}
        {msg && <p className="error">{msg}</p>}
        <div className="row">
          <button className="btn btn-gold btn-small" disabled={busy} style={{ flex: 1 }}>
            {busy ? "Salvo..." : "Salva"}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(false)}>
            Annulla
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="admin-row">
      <div className="admin-row-head">
        <b>
          {admin.username}
          <span className="role-badge">{kindLabel(admin.kind)}</span>
          {admin.main && <span className="muted"> · principale</span>}
        </b>
        {!admin.main && (
          <span className="row">
            <button className="btn btn-ghost btn-small" onClick={() => setEditing(true)}>
              Modifica
            </button>
            {!isMe && (
              <button className="btn btn-ghost btn-small" onClick={() => onRemove(admin)} aria-label="Rimuovi">
                ✕
              </button>
            )}
          </span>
        )}
      </div>
      <div className="admin-row-pass">
        {admin.password === null ? (
          <span className="muted">Password non disponibile{admin.main ? "" : ": usa Modifica per impostarne una nuova"}</span>
        ) : (
          <>
            <span className="mono">{show ? admin.password : "•".repeat(Math.min(admin.password.length, 10))}</span>
            <button className="btn btn-ghost btn-small" onClick={() => setShow((s) => !s)}>
              {show ? "Nascondi" : "Mostra"}
            </button>
          </>
        )}
      </div>
      {admin.main && <small className="muted">Nome e password si cambiano nelle impostazioni di Vercel.</small>}
    </div>
  );
}
