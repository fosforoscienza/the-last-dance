-- ============================================================
-- The LAST Dance — schema database
-- Da eseguire una volta nel SQL Editor di Supabase.
-- ============================================================

-- Giocatori: dati pubblici (nome, squadra, punti, ticket).
-- Leggibili in sola lettura dal browser per gli aggiornamenti live.
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  team        text not null default '',
  points      integer not null default 0 check (points >= 0),
  hotdog_1    boolean not null default false,
  hotdog_2    boolean not null default false,
  fries       boolean not null default false,
  donut       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists players_name_key on public.players (lower(name));

-- Credenziali: mai accessibili dal browser (solo service role lato server).
create table if not exists public.credentials (
  id             uuid primary key default gen_random_uuid(),
  username       text not null,
  password_hash  text not null,
  password_enc   text,
  role           text not null check (role in ('user', 'admin')),
  player_id      uuid references public.players (id) on delete cascade,
  created_at     timestamptz not null default now()
);

-- Aggiornamento: copia cifrata della password, visibile agli admin
alter table public.credentials add column if not exists password_enc text;

-- Aggiornamento: ruolo degli admin (vuoto = direttore)
alter table public.credentials add column if not exists admin_kind text
  check (admin_kind in ('cuoco', 'giostraio', 'jolly', 'direttore'));

create unique index if not exists credentials_username_key on public.credentials (lower(username));

-- Impostazioni dell'app (es. password del super admin cambiata dall'app). Mai accessibili dal browser.
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- Row Level Security
alter table public.players enable row level security;
alter table public.credentials enable row level security;

drop policy if exists "players are readable" on public.players;
create policy "players are readable" on public.players
  for select to anon, authenticated using (true);
-- Nessuna policy su credentials => accesso negato a anon/authenticated.

-- Somma/sottrazione punti atomica, mai sotto zero.
create or replace function public.change_points(p_id uuid, p_delta integer)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.players;
begin
  update public.players
     set points = greatest(0, points + p_delta),
         updated_at = now()
   where id = p_id
  returning * into result;
  return result;
end;
$$;

revoke all on function public.change_points(uuid, integer) from public, anon, authenticated;
grant execute on function public.change_points(uuid, integer) to service_role;

-- Realtime sugli aggiornamenti dei giocatori
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
end $$;

-- ============================================================
-- Caccia al tesoro
-- ============================================================

-- Domande a cui ogni giocatore ha risposto correttamente (1…10). Solo lato server.
create table if not exists public.treasure_found (
  player_id   uuid not null references public.players (id) on delete cascade,
  question    smallint not null check (question between 1 and 10),
  created_at  timestamptz not null default now(),
  primary key (player_id, question)
);
alter table public.treasure_found enable row level security;
-- Nessuna policy su treasure_found => accesso negato a anon/authenticated.

-- Chi ha trovato tutti i simboli: leggibile dal browser per avvisare gli admin in tempo reale.
create table if not exists public.treasure_winners (
  player_id  uuid primary key references public.players (id) on delete cascade,
  name       text not null,
  won_at     timestamptz not null default now()
);
alter table public.treasure_winners enable row level security;

drop policy if exists "treasure winners are readable" on public.treasure_winners;
create policy "treasure winners are readable" on public.treasure_winners
  for select to anon, authenticated using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'treasure_winners'
  ) then
    alter publication supabase_realtime add table public.treasure_winners;
  end if;
end $$;
