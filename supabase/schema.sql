-- NACORP OS : à coller dans Supabase > SQL Editor > Run
create table if not exists profiles(id uuid primary key references auth.users on delete cascade,
 username text,avatar text,role text not null default 'membre',created_at timestamptz default now());
create table if not exists records(id uuid primary key default gen_random_uuid(),
 owner uuid not null default auth.uid() references auth.users on delete cascade,
 module text not null,data jsonb not null default '{}',shared_with uuid[] not null default '{}',
 created_at timestamptz default now(),updated_at timestamptz default now());
create index if not exists records_mod on records(owner,module);
create table if not exists messages(id uuid primary key default gen_random_uuid(),
 room text not null default 'general',user_id uuid not null default auth.uid() references auth.users,
 author text,body text not null,created_at timestamptz default now());
alter table profiles enable row level security;
alter table records enable row level security;
alter table messages enable row level security;
drop policy if exists "profils lisibles" on profiles;
create policy "profils lisibles" on profiles for select to authenticated using(true);
drop policy if exists "profil propre insert" on profiles;
create policy "profil propre insert" on profiles for insert to authenticated with check(id=auth.uid());
drop policy if exists "profil propre update" on profiles;
create policy "profil propre update" on profiles for update to authenticated using(id=auth.uid());
drop policy if exists "records lecture" on records;
create policy "records lecture" on records for select to authenticated using(owner=auth.uid() or auth.uid()=any(shared_with));
drop policy if exists "records insert" on records;
create policy "records insert" on records for insert to authenticated with check(owner=auth.uid());
drop policy if exists "records update" on records;
create policy "records update" on records for update to authenticated using(owner=auth.uid());
drop policy if exists "records delete" on records;
create policy "records delete" on records for delete to authenticated using(owner=auth.uid());
drop policy if exists "chat lecture" on messages;
create policy "chat lecture" on messages for select to authenticated using(true);
drop policy if exists "chat ecriture" on messages;
create policy "chat ecriture" on messages for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "chat suppression" on messages;
create policy "chat suppression" on messages for delete to authenticated using(user_id=auth.uid());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,username) values(new.id,split_part(new.email,'@',1)) on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user on auth.users;
create trigger on_auth_user after insert on auth.users for each row execute function public.handle_new_user();
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='messages') then
  alter publication supabase_realtime add table public.messages; end if;
exception when others then raise notice 'realtime: %',sqlerrm; end $$;
insert into storage.buckets(id,name,public) values('files','files',false) on conflict do nothing;
do $$ begin
 drop policy if exists "fichiers propres" on storage.objects;
 create policy "fichiers propres" on storage.objects for all to authenticated
  using(bucket_id='files' and (storage.foldername(name))[1]=auth.uid()::text)
  with check(bucket_id='files' and (storage.foldername(name))[1]=auth.uid()::text);
exception when others then raise notice 'storage: %',sqlerrm; end $$;

insert into profiles(id,username) select id,split_part(email,'@',1) from auth.users on conflict do nothing;
