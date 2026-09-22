"use client";

import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PLAYER_COLUMNS, type Player } from "@/lib/types";
import EditUser from "./EditUser";
import AdminRow, { type AdminInfo } from "./AdminRow";

type Row = { name: string; password: string; team?: string };

const CHUNK = 50;
const NAME_KEYS = ["nome utente", "nomeutente", "nome", "utente", "username", "user name", "name"];
const PASS_KEYS = ["password", "pass", "pwd", "psw"];
const TEAM_KEYS = ["squadra", "team", "gruppo"];

const cleanHeader = (h: string) => h.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

// Legge nome utente (colonna A) e password (colonna B). Le altre colonne vengono ignorate,
// tranne un'eventuale colonna intitolata "squadra" (o "team").
function parseCsv(text: string): Row[] {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), { skipEmptyLines: "greedy" });
  const lines = parsed.data.map((r) => r.map((c) => String(c ?? "").trim()));
  if (lines.length === 0) return [];

  const header = lines[0].map(cleanHeader);
  const hasHeader =
    NAME_KEYS.includes(header[0] ?? "") ||
    PASS_KEYS.includes(header[1] ?? "") ||
    header.some((h) => TEAM_KEYS.includes(h));
  const teamIdx = hasHeader ? header.findIndex((h, i) => i > 1 && TEAM_KEYS.includes(h)) : -1;

  return lines
    .slice(hasHeader ? 1 : 0)
    .map((r) => {
      const row: Row = { name: r[0] ?? "", password: r[1] ?? "" };
      if (teamIdx !== -1) row.team = r[teamIdx] ?? "";
      return row;
    })
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
  const [editing, setEditing] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingMany, setDeletingMany] = useState(false);

  const [single, setSingle] = useState<Row>({ name: "", password: "", team: "" });
  const [singleMsg, setSingleMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingSingle, setSavingSingle] = useState(false);

  const [admins, setAdmins] = useState<AdminInfo[]>([]);
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

  async function addSingle(e: React.FormEvent) {
    e.preventDefault();
    setSingleMsg(null);
    if (!single.name.trim() || !single.password.trim()) {
      setSingleMsg({ ok: false, text: "Nome e password sono obbligatori" });
      return;
    }
    const exists = players.some((p) => p.name.toLowerCase() === single.name.trim().replace(/\s+/g, " ").toLowerCase());
    if (exists && !confirm(`${single.name.trim()} esiste già. Vuoi aggiornare password e squadra?`)) return;
    setSavingSingle(true);
    const res = await fetch("/api/admin/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: [single] }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingSingle(false);
    if (!res.ok || data.errors?.length) {
      setSingleMsg({ ok: false, text: data.errors?.[0] || data.error || "Errore" });
      return;
    }
    setSingleMsg({ ok: true, text: data.created ? `${single.name.trim()} creato` : `${single.name.trim()} aggiornato` });
    setSingle({ name: "", password: "", team: single.team });
    loadPlayers();
  }

  async function deletePlayer(p: Player) {
    if (!confirm(`Eliminare ${p.name}?`)) return;
    await fetch(`/api/admin/players?id=${p.id}`, { method: "DELETE" });
    setEditing(null);
    loadPlayers();
  }

  function toggleSelected(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function deleteSelected() {
    const ids = players.filter((p) => selected.has(p.id)).map((p) => p.id);
    if (ids.length === 0) return;
    const names = players.filter((p) => selected.has(p.id)).map((p) => p.name);
    const preview = names.slice(0, 5).join(", ") + (names.length > 5 ? ` e altri ${names.length - 5}` : "");
    if (!confirm(`Eliminare ${ids.length} ${ids.length === 1 ? "utente" : "utenti"} con punti e ticket?\n${preview}`)) return;
    setDeletingMany(true);
    const res = await fetch("/api/admin/players?ids=1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setDeletingMany(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Errore durante l'eliminazione");
      return;
    }
    exitSelecting();
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

  async function removeAdmin(a: AdminInfo) {
    if (!confirm(`Rimuovere l'admin ${a.username}?`)) return;
    await fetch(`/api/admin/admins?id=${a.id}`, { method: "DELETE" });
    loadAdmins();
  }

  const teams = Array.from(new Set(players.map((p) => p.team).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const filtered = players.filter(
    (p) => !search || `${p.name} ${p.team}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="scroll" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="card section">
        <h3>Aggiungi un utente</h3>
        <form className="section" onSubmit={addSingle}>
          <input
            className="input"
            placeholder="Nome"
            autoCapitalize="words"
            value={single.name}
            onChange={(e) => setSingle({ ...single, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Password"
            autoCapitalize="none"
            autoCorrect="off"
            value={single.password}
            onChange={(e) => setSingle({ ...single, password: e.target.value })}
          />
          <input
            className="input"
            placeholder="Squadra"
            list="teams-list"
            value={single.team ?? ""}
            onChange={(e) => setSingle({ ...single, team: e.target.value })}
          />
          <datalist id="teams-list">
            {teams.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          {singleMsg && (
            <p className={singleMsg.ok ? "" : "error"} style={{ margin: 0, fontWeight: 900 }}>
              {singleMsg.text}
            </p>
          )}
          <button className="btn btn-gold" disabled={savingSingle}>
            {savingSingle ? "Salvo..." : "Aggiungi utente"}
          </button>
        </form>
      </section>

      <section className="card section">
        <h3>Carica utenti da CSV</h3>
        <p className="muted" style={{ margin: 0 }}>
          Colonna A: <b>nome utente</b>, colonna B: <b>password</b> (prima riga di intestazione facoltativa, separatore , o
          ;). Le altre colonne vengono ignorate, tranne una colonna intitolata <b>squadra</b>. Se un nome esiste già, la
          password viene aggiornata e i punti restano invariati.
        </p>
        <label className="file-label">
          {fileName || "Scegli file CSV"}
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
        </label>
        {rows.length > 0 && (
          <>
            <p className="muted" style={{ margin: 0 }}>
              {rows.length} utenti trovati. Esempio: {rows[0].name}{rows[0].team ? ` / ${rows[0].team}` : ""}
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
        <div className="topbar">
          <h3>Utenti ({players.length})</h3>
          {players.length > 0 &&
            (selecting ? (
              <button className="btn btn-ghost btn-small" onClick={exitSelecting}>
                Annulla
              </button>
            ) : (
              <button className="btn btn-ghost btn-small" onClick={() => setSelecting(true)}>
                Seleziona
              </button>
            ))}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {selecting
            ? "Tocca gli utenti da eliminare."
            : "Tocca un utente per vedere la password o modificarlo."}
        </p>
        <input className="input" placeholder="Cerca nome o squadra" value={search} onChange={(e) => setSearch(e.target.value)} />
        {selecting && (
          <div className="select-bar">
            {filtered.length > 0 && filtered.every((p) => selected.has(p.id)) ? (
              <button
                className="btn btn-ghost btn-small"
                onClick={() =>
                  setSelected((cur) => {
                    const next = new Set(cur);
                    filtered.forEach((p) => next.delete(p.id));
                    return next;
                  })
                }
              >
                Deseleziona {search ? "trovati" : "tutti"}
              </button>
            ) : (
              <button
                className="btn btn-ghost btn-small"
                onClick={() => setSelected((cur) => new Set([...cur, ...filtered.map((p) => p.id)]))}
              >
                Seleziona {search ? `trovati (${filtered.length})` : `tutti (${filtered.length})`}
              </button>
            )}
            <button
              className="btn btn-danger btn-small"
              disabled={selected.size === 0 || deletingMany}
              onClick={deleteSelected}
            >
              {deletingMany ? "Elimino..." : `Elimina (${selected.size})`}
            </button>
          </div>
        )}
        <div>
          {filtered.slice(0, 100).map((p) => (
            <div
              className={`list-row user-row ${selecting && selected.has(p.id) ? "selected" : ""}`}
              key={p.id}
              onClick={() => (selecting ? toggleSelected(p.id) : setEditing(p.id))}
            >
              {selecting && <span className={`check ${selected.has(p.id) ? "on" : ""}`} aria-hidden />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{p.name}</b> <span className="muted">· {p.team || "—"} · {p.points} pt</span>
              </span>
              {!selecting && <span className="btn btn-ghost btn-small">Modifica</span>}
            </div>
          ))}
          {filtered.length > 100 && <p className="muted">Mostrati 100 di {filtered.length}. Usa la ricerca.</p>}
        </div>
        {players.length > 0 && !selecting && (
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
          <AdminRow key={`${a.id}-${a.username}-${a.password}`} admin={a} onChanged={loadAdmins} onRemove={removeAdmin} />
        ))}
        <form className="section" onSubmit={addAdmin}>
          <input className="input" placeholder="Nome admin" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          <input
            className="input"
            placeholder="Password"
            autoCapitalize="none"
            autoCorrect="off"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
          />
          {adminMsg && <p className="muted" style={{ margin: 0 }}>{adminMsg}</p>}
          <button className="btn">Aggiungi admin</button>
        </form>
      </section>
      {editing && (
        <EditUser
          playerId={editing}
          teams={teams}
          onClose={() => setEditing(null)}
          onSaved={loadPlayers}
          onDelete={deletePlayer}
        />
      )}
    </div>
  );
}
