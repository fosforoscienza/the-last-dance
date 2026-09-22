export type AdminKind = "cuoco" | "giostraio" | "jolly" | "direttore";
export type Permission = "points" | "food" | "manage";

export const ADMIN_KINDS: { kind: AdminKind; label: string; description: string }[] = [
  { kind: "cuoco", label: "Cuoco", description: "Segna solo i ticket cibo" },
  { kind: "giostraio", label: "Giostraio", description: "Assegna solo i punti" },
  { kind: "jolly", label: "Jolly", description: "Assegna punti e segna i ticket cibo" },
  { kind: "direttore", label: "Direttore", description: "Può fare tutto, anche gestire gli utenti" },
];

const PERMISSIONS: Record<AdminKind, Permission[]> = {
  cuoco: ["food"],
  giostraio: ["points"],
  jolly: ["points", "food"],
  direttore: ["points", "food", "manage"],
};

export function isAdminKind(v: unknown): v is AdminKind {
  return v === "cuoco" || v === "giostraio" || v === "jolly" || v === "direttore";
}

// Gli admin creati prima dei ruoli (admin_kind vuoto) restano direttori
export function toAdminKind(v: unknown): AdminKind {
  return isAdminKind(v) ? v : "direttore";
}

export function can(kind: AdminKind, perm: Permission) {
  return PERMISSIONS[kind].includes(perm);
}

export function kindLabel(kind: AdminKind) {
  return ADMIN_KINDS.find((k) => k.kind === kind)?.label ?? kind;
}
