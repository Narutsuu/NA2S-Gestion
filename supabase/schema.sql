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
create policy "profils lisibles" on profiles for select to authenticated using(true);
create policy "profil propre insert" on profiles for insert to authenticated with check(id=auth.uid());
create policy "profil propre update" on profiles for update to authenticated using(id=auth.uid());
create policy "records lecture" on records for select to authenticated using(owner=auth.uid() or auth.uid()=any(shared_with));
create policy "records insert" on records for insert to authenticated with check(owner=auth.uid());
create policy "records update" on records for update to authenticated using(owner=auth.uid());
create policy "records delete" on records for delete to authenticated using(owner=auth.uid());
create policy "chat lecture" on messages for select to authenticated using(true);
create policy "chat ecriture" on messages for insert to authenticated with check(user_id=auth.uid());
create policy "chat suppression" on messages for delete to authenticated using(user_id=auth.uid());
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into profiles(id,username) values(new.id,split_part(new.email,'@',1)) on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user on auth.users;
create trigger on_auth_user after insert on auth.users for each row execute function handle_new_user();
alter publication supabase_realtime add table messages;
insert into storage.buckets(id,name,public) values('files','files',false) on conflict do nothing;
create policy "fichiers propres" on storage.objects for all to authenticated
 using(bucket_id='files' and (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id='files' and (storage.foldername(name))[1]=auth.uid()::text);
