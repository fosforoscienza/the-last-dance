# The LAST Dance

Web app a tema circo per gestire punti e ticket cibo durante l'evento.
Next.js (App Router) + Supabase, pronta per Vercel.

- **Utente**: vede nome, squadra, QR code personale, punti (live) e 4 ticket
  (2× hot dog, patatine, bombolone). I ticket usati diventano grigi.
- **Admin**: scanner QR → assegna/togli punti con tastierino, segna il cibo consegnato,
  classifica live (per giocatore e per squadra), import utenti da CSV, gestione admin.

## 1. Database Supabase

1. Crea un progetto Supabase.
2. Apri **SQL Editor** e incolla/esegui tutto il file [`supabase/schema.sql`](supabase/schema.sql).

## 2. Variabili d'ambiente (Vercel → Settings → Environment Variables)

| Variabile | Dove si trova |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` / secret key (**segreta**) |
| `SESSION_SECRET` | una stringa casuale lunga (min 32 caratteri) |
| `ADMIN_USERNAME` | nome dell'admin principale |
| `ADMIN_PASSWORD` | password dell'admin principale |

Vedi [`.env.example`](.env.example). Per lo sviluppo locale copia il file in `.env.local`.

## 3. Logo

Carica il logo in `public/logo/logo.png` (vedi [`public/logo/README.md`](public/logo/README.md)).
Viene mostrato in bianco nel footer.

## 4. CSV utenti

Tre colonne: **nome, password, squadra** (intestazione facoltativa, separatore `,` o `;`).
Esempio: [`public/esempio-utenti.csv`](public/esempio-utenti.csv).
L'utente accede con il nome (maiuscole/minuscole indifferenti) e la password del CSV.

## Sviluppo

```bash
npm install
npm run dev
```
