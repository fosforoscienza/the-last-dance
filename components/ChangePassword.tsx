"use client";

import { useState } from "react";

// Solo per il super admin (admin principale)
export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function close() {
    setOpen(false);
    setCurrent("");
    setNext("");
    setRepeat("");
    setMsg(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.trim() !== repeat.trim()) {
      setMsg({ ok: false, text: "Le due nuove password non coincidono" });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Errore" });
      return;
    }
    setCurrent("");
    setNext("");
    setRepeat("");
    setMsg({ ok: true, text: "Password cambiata" });
  }

  const type = show ? "text" : "password";

  return (
    <>
      <button className="btn btn-ghost btn-small" onClick={() => setOpen(true)}>
        Password
      </button>
      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="topbar">
              <h3 className="title" style={{ fontSize: "1.1rem" }}>
                Cambia password
              </h3>
              <button className="btn btn-ghost btn-small" onClick={close} aria-label="Chiudi">
                ✕
              </button>
            </div>
              <form className="section" onSubmit={save}>
                <label className="field">
                  <span>Password attuale</span>
                  <input className="input" type={type} value={current} onChange={(e) => setCurrent(e.target.value)} autoCapitalize="none" autoCorrect="off" />
                </label>
                <label className="field">
                  <span>Nuova password</span>
                  <input className="input" type={type} value={next} onChange={(e) => setNext(e.target.value)} autoCapitalize="none" autoCorrect="off" />
                </label>
                <label className="field">
                  <span>Ripeti la nuova password</span>
                  <input className="input" type={type} value={repeat} onChange={(e) => setRepeat(e.target.value)} autoCapitalize="none" autoCorrect="off" />
                </label>
                <button type="button" className="manual-link" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => setShow((s) => !s)}>
                  {show ? "Nascondi password" : "Mostra password"}
                </button>
                {msg && (
                  <p className={msg.ok ? "" : "error"} style={{ margin: 0, fontWeight: 900 }}>
                    {msg.text}
                  </p>
                )}
                <button className="btn btn-gold" disabled={busy || !current || !next || !repeat}>
                  {busy ? "Salvo..." : "Salva nuova password"}
                </button>
              </form>
          </div>
        </div>
      )}
    </>
  );
}
