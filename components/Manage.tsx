"use client";

import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PLAYER_COLUMNS, type Player } from "@/lib/types";

type Row = { name: string; password: string; team: string };
type Admin = { id: string; username: string };

const CHUNK = 50;
const NAME_KEYS = ["nome", "name", "nomi", "utente", "username"];
const PASS_KEYS = ["password", "pass", "pwd", "passwords"];
const TEAM_KEYS = ["squadra", "team", "squadre", "gruppo"];

function parseCsv(text: string): Row[] {
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: true });
  const lines = parsed.data.map((r) => r.map((c) => String(c ?? "").trim()));
  if (lines.length === 0) return [];

  let nameIdx = 0;
  let passIdx = 1;
  let teamIdx = 2;
  const header = lines[0].map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => [...NAME_KEYS, ...PASS_KEYS, ...TEAM_KEYS].includes(h));
  if (hasHeader) {
    const find = (keys: string[], fallback: number) => {
      const i = header.findIndex((h) => keys.includes(h));
      return i === -1 ? fallback : i;
    };
    nameIdx = find(NAME_KEYS, 0);
    passIdx = find(PASS_KEYS, 1);
    teamIdx = find(TEAM_KEYS, 2);
  }
  return lines
    .slice(hasHeader ? 1 : 0)
    .map((r) => ({ name: r[nameIdx] ?? "", password: r[passIdx] ?? "", team: r[teamIdx] ?? "" }))
    .filter((r) => r.name || r.password);
}

export default function Manage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminName, setAdminName] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  const loadPlayers = useCallback(async () => {
    const { data } = await supabaseBrowser().from("players").select(PLAYER_COLUMNS).order("name");
    if (data) setPlayers(data as Player[]);
  }, []);

  const loadAdmins = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setAdmins((await res.json()).admins);
  }, []);

  useEffect(() => {
    loadPlayers();
    loadAdmins();
  }, [loadPlayers, loadAdmins]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setProgress("");
    setImportErrors([]);
    setRows(parseCsv(await file.text()));
  }

  async function runImport() {
    setImporting(true);
    setImportErrors([]);
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i += CHUNK) {
      setProgress(`Importazione ${Math.min(i + CHUNK, rows.length)}/${rows.length}...`);
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.slice(i, i + CHUNK) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errors.push(data.error || `Errore nel blocco ${i / CHUNK + 1}`);
        continue;
      }
      created += data.created;
      updated += data.updated;
      errors.push(...data.errors);
    }
    setProgress(`Fatto! ${created} creati, ${updated} aggiornati${errors.length ? `, ${errors.length} errori` : ""}.`);
    setImportErrors(errors);
    setRows([]);
    setFileName("");
    setImporting(false);
    loadPlayers();
  }

  async function deletePlayer(p: Player) {
    if (!confirm(`Eliminare ${p.name}?`)) return;
    await fetch(`/api/admin/players?id=${p.id}`, { method: "DELETE" });
    loadPlayers();
  }

  async function deleteAll() {
    if (!confirm("Eliminare TUTTI gli utenti con punti e ticket? L'operazione non si può annullare.")) return;
    if (prompt('Scrivi "ELIMINA" per confermare') !== "ELIMINA") return;
    await fetch("/api/admin/players?all=1", { method: "DELETE" });
    loadPlayers();
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdminMsg("");
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: adminName, password: adminPass }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAdminMsg(data.error || "Errore");
      return;
    }
    setAdminName("");
    setAdminPass("");
    setAdminMsg("Admin creato");
    loadAdmins();
  }

  async function removeAdmin(a: Admin) {
    if (!confirm(`Rimuovere l'admin ${a.username}?`)) return;
    await fetch(`/api/admin/admins?id=${a.id}`, { method: "DELETE" });
    loadAdmins();
  }

  const filtered = players.filter(
    (p) => !search || `${p.name} ${p.team}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="scroll" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="card section">
        <h3>Carica utenti da CSV</h3>
        <p className="muted" style={{ margin: 0 }}>
          Colonne: <b>nome</b>, <b>password</b>, <b>squadra</b> (con o senza intestazione, separatore , o ;). Se un nome
          esiste già, password e squadra vengono aggiornate.
        </p>
        <label className="file-label">
          {fileName || "Scegli file CSV"}
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
        </label>
        {rows.length > 0 && (
          <>
            <p className="muted" style={{ margin: 0 }}>
              {rows.length} utenti trovati. Esempio: {rows[0].name} / {rows[0].team || "—"}
            </p>
            <button className="btn btn-gold" disabled={importing} onClick={runImport}>
              {importing ? "Importo..." : `Importa ${rows.length} utenti`}
            </button>
          </>
        )}
        {progress && <p style={{ margin: 0, fontWeight: 900 }}>{progress}</p>}
        {importErrors.length > 0 && (
          <ul className="error" style={{ margin: 0, paddingLeft: 18 }}>
            {importErrors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {importErrors.length > 20 && <li>…e altri {importErrors.length - 20}</li>}
          </ul>
        )}
        <a className="muted" href="/esempio-utenti.csv" download>
          Scarica un CSV di esempio
        </a>
      </section>

      <section className="card section">
        <h3>Utenti ({players.length})</h3>
        <input className="input" placeholder="Cerca nome o squadra" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div>
          {filtered.slice(0, 100).map((p) => (
            <div className="list-row" key={p.id}>
              <span>
                <b>{p.name}</b> <span className="muted">· {p.team || "—"} · {p.points} pt</span>
              </span>
              <button className="btn btn-ghost btn-small" onClick={() => deletePlayer(p)}>
                ✕
              </button>
            </div>
          ))}
          {filtered.length > 100 && <p className="muted">Mostrati 100 di {filtered.length}. Usa la ricerca.</p>}
        </div>
        {players.length > 0 && (
          <button className="btn btn-danger btn-small" onClick={deleteAll}>
            Elimina tutti gli utenti
          </button>
        )}
      </section>

      <section className="card section">
        <h3>Admin</h3>
        <p className="muted" style={{ margin: 0 }}>
          L&apos;admin principale è definito nelle impostazioni di Vercel. Qui puoi aggiungerne altri (es. gli addetti al
          cibo).
        </p>
        {admins.map((a) => (
          <div className="list-row" key={a.id}>
            <b>{a.username}</b>
            <button className="btn btn-ghost btn-small" onClick={() => removeAdmin(a)}>
              ✕
            </button>
          </div>
        ))}
        <form className="section" onSubmit={addAdmin}>
          <input className="input" placeholder="Nome admin" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
          />
          {adminMsg && <p className="muted" style={{ margin: 0 }}>{adminMsg}</p>}
          <button className="btn">Aggiungi admin</button>
        </form>
      </section>
    </div>
  );
}
