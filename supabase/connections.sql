-- À exécuter UNE fois dans SQL Editor (ne touche pas aux données existantes)
create table if not exists public.connections(id uuid primary key default gen_random_uuid(),
 owner uuid not null references auth.users on delete cascade,provider text not null,account_id text not null,
 account_email text,account_name text,scopes text not null default '',refresh_token text,access_token text,
 expires_at timestamptz,created_at timestamptz default now(),unique(owner,provider,account_id));
create table if not exists public.oauth_states(state text primary key,owner uuid not null,verifier text not null,created_at timestamptz default now());
alter table public.connections enable row level security;
alter table public.oauth_states enable row level security;
drop policy if exists "conn lecture" on public.connections;
create policy "conn lecture" on public.connections for select to authenticated using(owner=auth.uid());
revoke all on public.connections from anon,authenticated;
revoke all on public.oauth_states from anon,authenticated;
-- le navigateur ne peut lire QUE ces colonnes : jamais les tokens
grant select(id,provider,account_email,account_name,scopes,created_at) on public.connections to authenticated;
