-- ============================================================
-- CodeSync — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Rooms (collaborative workspaces)
create table if not exists rooms (
  id           text        primary key,
  name         text        not null,
  owner_id     uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  last_active  timestamptz not null default now(),
  language     text        not null default 'javascript',
  edit_count   integer     not null default 0
);

-- Room collaborators and their roles
create table if not exists room_members (
  room_id    text        not null references rooms(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null check (role in ('owner', 'editor', 'viewer')) default 'editor',
  joined_at  timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Document snapshots (version history)
create table if not exists snapshots (
  id          uuid        primary key default gen_random_uuid(),
  room_id     text        not null references rooms(id) on delete cascade,
  file_name   text        not null,
  content     text        not null,
  label       text        not null default '',
  created_by  uuid        references auth.users(id) on delete set null,
  author      text        not null default 'anonymous',
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists snapshots_room_file_idx on snapshots(room_id, file_name);
create index if not exists members_user_idx         on room_members(user_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table rooms        enable row level security;
alter table room_members enable row level security;
alter table snapshots    enable row level security;

-- Rooms: visible to members only
create policy "rooms_select" on rooms
  for select using (
    auth.uid() in (
      select user_id from room_members where room_id = rooms.id
    )
  );

create policy "rooms_insert" on rooms
  for insert with check (auth.uid() = owner_id);

create policy "rooms_update" on rooms
  for update using (
    auth.uid() in (
      select user_id from room_members where room_id = rooms.id and role = 'owner'
    )
  );

-- Room members: members can see others in the same room
create policy "members_select" on room_members
  for select using (
    auth.uid() in (
      select user_id from room_members m2 where m2.room_id = room_members.room_id
    )
  );

create policy "members_insert" on room_members
  for insert with check (auth.uid() = user_id);

-- Snapshots: room members can see and create snapshots
create policy "snapshots_select" on snapshots
  for select using (
    auth.uid() in (
      select user_id from room_members where room_id = snapshots.room_id
    )
  );

create policy "snapshots_insert" on snapshots
  for insert with check (
    auth.uid() in (
      select user_id from room_members where room_id = snapshots.room_id
    )
  );

create policy "snapshots_delete" on snapshots
  for delete using (auth.uid() = created_by);

-- ============================================================
-- Helper function: increment edit count
-- ============================================================
create or replace function increment_edit_count(room_id text)
returns void as $$
  update rooms set edit_count = edit_count + 1, last_active = now()
  where id = room_id;
$$ language sql security definer;
