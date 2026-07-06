-- NWC Review Kit — Supabase schema (run ONCE per shared database).
-- Dashboard > SQL Editor > New query > paste > Run.
-- One shared database serves every website; rows are namespaced by project_id.
--
-- Note: the kit needs NO extra columns for replies or anonymous authorship.
-- The anonymous author id is stored in `author`, and reply/edit metadata rides
-- inside the `anchor` JSON, so this base schema is all you ever need.

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  text not null,
  page_path   text not null,
  anchor      jsonb not null,                  -- position + { parentId?, editedAt? }
  author      text not null,                   -- anonymous per-browser id (grouped/labelled in the UI)
  body        text not null,
  status      text not null default 'open',    -- 'open' | 'resolved' (soft delete)
  created_at  timestamptz not null default now()
);

create index if not exists comments_project_page_idx on public.comments (project_id, page_path);
create index if not exists comments_project_status_idx on public.comments (project_id, status);

-- Row Level Security. MVP: the publishable (anon) key may read/insert/update.
-- NOTE for multi-tenant hardening later: scope reads/writes to a per-project
-- token so one client's link can't read another project's comments.
alter table public.comments enable row level security;

drop policy if exists "anon read"   on public.comments;
drop policy if exists "anon insert" on public.comments;
drop policy if exists "anon update" on public.comments;

create policy "anon read"   on public.comments for select using (true);
create policy "anon insert" on public.comments for insert with check (true);
create policy "anon update" on public.comments for update using (true) with check (true);

-- We keep resolved comments (no delete), so no delete policy is granted.
