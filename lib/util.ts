export function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}

// Toglie spazi superflui e uniforma gli accenti (NFC)
export function normalizeName(s: unknown) {
  return String(s ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

// Confronto tra nomi senza distinguere maiuscole/minuscole
export function sameName(a: unknown, b: unknown) {
  return normalizeName(a).toLocaleLowerCase("it") === normalizeName(b).toLocaleLowerCase("it");
}

// Nome dell'admin principale definito su Vercel (se presente)
export function envAdminName() {
  const n = normalizeName(process.env.ADMIN_USERNAME);
  return n || null;
}

export function isEnvAdminName(name: unknown) {
  const env = envAdminName();
  return env !== null && sameName(name, env);
}
