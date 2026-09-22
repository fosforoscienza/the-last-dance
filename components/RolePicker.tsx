"use client";

import { ADMIN_KINDS, type AdminKind } from "@/lib/roles";

export type RoleValue = AdminKind | "giocatore";

// Scelta del ruolo a "pillole", con la descrizione del ruolo selezionato
export default function RolePicker({
  value,
  onChange,
  withPlayer = false,
}: {
  value: RoleValue | null;
  onChange: (v: RoleValue) => void;
  withPlayer?: boolean;
}) {
  const options: { kind: RoleValue; label: string; description: string }[] = [
    ...(withPlayer ? [{ kind: "giocatore" as RoleValue, label: "Giocatore", description: "Ha il QR code, i punti e i ticket" }] : []),
    ...ADMIN_KINDS,
  ];
  const current = options.find((o) => o.kind === value);
  return (
    <div className="role-picker">
      <div className="seg">
        {options.map((o) => (
          <button type="button" key={o.kind} className={value === o.kind ? "active" : ""} onClick={() => onChange(o.kind)}>
            {o.label}
          </button>
        ))}
      </div>
      <small className="muted">{current ? current.description : "Scegli un ruolo"}</small>
    </div>
  );
}
