-- Chạy file này trong Supabase SQL Editor
-- Project > SQL Editor > New query > paste và Run

create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists fund_contributions (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references players(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  total_cost numeric not null default 0 check (total_cost >= 0),
  created_at timestamptz default now()
);

create table if not exists session_players (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  cost_share numeric not null default 0,
  unique(session_id, player_id)
);

create table if not exists matches (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete set null,
  team1_player_ids uuid[] not null,
  team2_player_ids uuid[] not null,
  amount numeric not null check (amount >= 0),
  winner text not null check (winner in ('team1', 'team2')),
  created_at timestamptz default now()
);

-- Tắt RLS để dùng nội bộ (anon key có thể đọc/ghi)
alter table players disable row level security;
alter table fund_contributions disable row level security;
alter table sessions disable row level security;
alter table session_players disable row level security;
alter table matches disable row level security;
