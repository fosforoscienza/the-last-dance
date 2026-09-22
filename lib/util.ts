export function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}

export function normalizeName(s: unknown) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}
