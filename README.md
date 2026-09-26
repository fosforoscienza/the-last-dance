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
Viene mostrato nel footer con i colori originali.

## 4. CSV utenti

- Colonna **A**: `nome utente`, colonna **B**: `password` (la prima riga di intestazione è facoltativa, separatore `,` o `;`).
- Tutte le altre colonne vengono ignorate, tranne una colonna intitolata `squadra` (o `team`), se presente.
- Se un nome esiste già, la password viene aggiornata; punti, ticket e (senza colonna squadra) la squadra restano invariati.

Esempio: [`public/esempio-utenti.csv`](public/esempio-utenti.csv).
L'utente accede con il nome (maiuscole/minuscole indifferenti) e la password del CSV.

## 5. Caccia al tesoro

I giocatori aprono la sezione con il pulsante 🗺️, scansionano i QR nascosti e rispondono alle domande:
ogni risposta esatta mette a fuoco il simbolo dell'anno corrispondente. Chi li trova tutti e 10 vince il
super premio, e giostrai, jolly e direttori ricevono un avviso con il suo nome.
Ogni domanda ha 2 tentativi: dopo il secondo errore il simbolo sparisce e quel QR non si può più usare.

- **QR code**: in [`caccia-al-tesoro/qr/`](caccia-al-tesoro/qr/README.md), chiamati `1.png` … `10.png`.
  Il contenuto dei QR è libero: l'app lo legge dalle immagini (la cartella non è pubblica).
- **Simboli**: in [`public/caccia-al-tesoro/simboli/`](public/caccia-al-tesoro/simboli/README.md), `1.png` … `10.png`, nitidi (la sfocatura la fa l'app).
- **Domande e risposte**: in [`lib/treasure-questions.ts`](lib/treasure-questions.ts).
- **Database**: riesegui [`supabase/schema.sql`](supabase/schema.sql) per creare le tabelle `treasure_found`, `treasure_winners` e `treasure_wrong`.

## Sviluppo

```bash
npm install
npm run dev
```

## Deploy

Il branch `main` è quello pubblicato in Production su Vercel: ogni push su `main` avvia un nuovo deploy.
