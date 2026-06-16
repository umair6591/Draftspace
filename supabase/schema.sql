create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Untitled document',
  content_json jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents
alter column owner_id set default auth.uid();

create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'editor' check (permission in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  unique (document_id, shared_with_user_id)
);

create index if not exists documents_owner_id_idx on public.documents(owner_id);
create index if not exists document_shares_document_id_idx on public.document_shares(document_id);
create index if not exists document_shares_shared_with_user_id_idx on public.document_shares(shared_with_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_document_owner(target_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.documents
    where id = target_document_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.can_access_document(target_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.documents
    where id = target_document_id
      and owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.document_shares
    where document_id = target_document_id
      and shared_with_user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_document(target_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.documents
    where id = target_document_id
      and owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.document_shares
    where document_id = target_document_id
      and shared_with_user_id = auth.uid()
      and permission = 'editor'
  );
$$;

create or replace function public.create_document(
  document_title text default 'Untitled document',
  document_content_json jsonb default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  document_content_text text default ''
)
returns public.documents
language plpgsql
security definer
set search_path = public
as $$
declare
  new_document public.documents;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.documents (
    owner_id,
    title,
    content_json,
    content_text
  )
  values (
    auth.uid(),
    coalesce(nullif(trim(document_title), ''), 'Untitled document'),
    coalesce(document_content_json, '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb),
    coalesce(document_content_text, '')
  )
  returning * into new_document;

  return new_document;
end;
$$;

grant execute on function public.create_document(text, jsonb, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

drop policy if exists "Profiles are visible to signed-in users" on public.profiles;
create policy "Profiles are visible to signed-in users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can create owned documents" on public.documents;
create policy "Users can create owned documents"
on public.documents for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Users can read owned or shared documents" on public.documents;
create policy "Users can read owned or shared documents"
on public.documents for select
to authenticated
using (public.can_access_document(id));

drop policy if exists "Owners and editors can update documents" on public.documents;
create policy "Owners and editors can update documents"
on public.documents for update
to authenticated
using (public.can_edit_document(id))
with check (public.can_edit_document(id));

drop policy if exists "Owners can delete documents" on public.documents;
create policy "Owners can delete documents"
on public.documents for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Relevant users can read shares" on public.document_shares;
create policy "Relevant users can read shares"
on public.document_shares for select
to authenticated
using (shared_with_user_id = auth.uid() or public.is_document_owner(document_id));

drop policy if exists "Owners can share documents" on public.document_shares;
create policy "Owners can share documents"
on public.document_shares for insert
to authenticated
with check (public.is_document_owner(document_id));

drop policy if exists "Owners can update document shares" on public.document_shares;
create policy "Owners can update document shares"
on public.document_shares for update
to authenticated
using (public.is_document_owner(document_id))
with check (public.is_document_owner(document_id));

drop policy if exists "Owners can remove shares" on public.document_shares;
create policy "Owners can remove shares"
on public.document_shares for delete
to authenticated
using (public.is_document_owner(document_id));
