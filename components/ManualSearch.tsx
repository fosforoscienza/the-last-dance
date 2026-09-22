"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Item = { id: string; name: string; team: string };

export default function ManualSearch({ onPick }: { onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!open) return;
    supabaseBrowser()
      .from("players")
      .select("id,name,team")
      .order("name")
      .then(({ data }) => data && setItems(data as Item[]));
  }, [open]);

  if (!open) {
    return (
      <button className="manual-link" onClick={() => setOpen(true)}>
        Il QR non funziona? Inserisci il nome
      </button>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = q ? items.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 6) : [];

  return (
    <div className="manual">
      <div className="row">
        <input
          className="input"
          autoFocus
          placeholder="Nome utente"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches.length === 1) onPick(matches[0].id);
          }}
        />
        <button className="btn btn-ghost btn-small" onClick={() => setOpen(false)} aria-label="Chiudi">
          ✕
        </button>
      </div>
      {q && (
        <div className="manual-results">
          {matches.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Nessun utente trovato</p>
          ) : (
            matches.map((m) => (
              <button key={m.id} className="manual-item" onClick={() => onPick(m.id)}>
                <b>{m.name}</b>
                {m.team && <span className="muted"> · {m.team}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
