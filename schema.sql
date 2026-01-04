-- Create tables for Cricket Match Management

-- Teams Table
create table if not exists teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  captain_name text,
  contact_number text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Players Table
create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  role text check (role in ('Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Grounds Table
create table if not exists grounds (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Matches Table
create table if not exists matches (
  id uuid default gen_random_uuid() primary key,
  team_a_id uuid references teams(id) not null,
  team_b_id uuid references teams(id) not null,
  ground_id uuid references grounds(id) not null,
  match_date date not null,
  match_time time not null,
  overs_type text not null, -- e.g., 'T10', 'T20', '50 Overs', 'Custom'
  status text default 'Scheduled' check (status in ('Scheduled', 'Live', 'Completed', 'Cancelled')),
  toss_winner_id uuid references teams(id),
  winner_id uuid references teams(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table teams enable row level security;
alter table players enable row level security;
alter table grounds enable row level security;
alter table matches enable row level security;

-- Create Policies (Public Read, Public Write for MVP/Start)
-- Note: Ideally, write should be restricted to authenticated admins.

-- Teams
create policy "Allow public read access on teams"
  on teams for select
  using (true);

create policy "Allow public insert on teams"
  on teams for insert
  with check (true);

-- Players
create policy "Allow public read access on players"
  on players for select
  using (true);

create policy "Allow public insert on players"
  on players for insert
  with check (true);

-- Grounds
create policy "Allow public read access on grounds"
  on grounds for select
  using (true);

create policy "Allow public insert on grounds"
  on grounds for insert
  with check (true);

-- Matches
create policy "Allow public read access on matches"
  on matches for select
  using (true);

create policy "Allow public insert on matches"
  on matches for insert
  with check (true);

create policy "Allow public update on matches"
  on matches for update
  using (true);
