"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore di accesso");
      router.replace(data.role === "admin" ? "/admin" : "/user");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di accesso");
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-hero">
        <p className="subtitle">Benvenuti a</p>
        <h1 className="title">
          The <span>LAST</span>
          <br />
          Dance
        </h1>
      </div>
      <form onSubmit={submit} className="card">
        <input
          className="input"
          placeholder="tuonome.tuocognome"
          aria-label="Nome e cognome"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="input"
          placeholder="codice socio"
          aria-label="Codice socio"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-gold" disabled={loading}>
          {loading ? "Entro..." : "Entra in pista"}
        </button>
      </form>
    </div>
  );
}
