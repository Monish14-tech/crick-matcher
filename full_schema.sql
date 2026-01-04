-- CRICKET MATCHER COMPLETE SYSTEM SCHEMA
-- Run this in your Supabase SQL Editor to reset the database

-- 1. DROP EXISTING TABLES (Order matters due to foreign keys)
drop table if exists match_active_state cascade;
drop table if exists match_events cascade;
drop table if exists player_performances cascade;
drop table if exists match_scores cascade;
drop table if exists tournament_teams cascade;
drop table if exists matches cascade;
drop table if exists tournaments cascade;
drop table if exists players cascade;
drop table if exists teams cascade;
drop table if exists grounds cascade;

-- 2. CREATE TABLES

-- Grounds
create table grounds (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Teams
create table teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  captain_name text,
  contact_number text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Players
create table players (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  role text check (role in ('Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tournaments
create table tournaments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  start_date date,
  end_date date,
  status text default 'Upcoming' check (status in ('Upcoming', 'Ongoing', 'Completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tournament Teams Junction
create table tournament_teams (
  tournament_id uuid references tournaments(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  primary key (tournament_id, team_id)
);

-- Matches
create table matches (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete set null,
  team_a_id uuid references teams(id) on delete cascade not null,
  team_b_id uuid references teams(id) on delete cascade not null,
  ground_id uuid references grounds(id) on delete cascade not null,
  match_date date not null,
  match_time time not null,
  overs_type text not null, -- 'T10', 'T20', '50 Overs'
  status text default 'Scheduled' check (status in ('Scheduled', 'Live', 'Completed', 'Cancelled')),
  toss_winner_id uuid references teams(id),
  winner_id uuid references teams(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Match Events (Ball by Ball)
create table match_events (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  innings_no integer not null,
  over_no integer not null,
  ball_no integer not null,
  batter_id uuid references players(id) on delete cascade,
  bowler_id uuid references players(id) on delete cascade,
  non_striker_id uuid references players(id) on delete cascade,
  runs_batter integer default 0,
  runs_extras integer default 0,
  extra_type text check (extra_type in ('Wide', 'No Ball', 'Bye', 'Leg Bye', 'Penalty')),
  wicket_type text,
  player_out_id uuid references players(id) on delete cascade,
  commentary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Match Scores (Current Summary)
create table match_scores (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  runs_scored integer default 0,
  wickets_lost integer default 0,
  overs_played decimal(3,1) default 0.0,
  is_first_innings boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(match_id, team_id)
);

-- Player Performances (Summary Stats)
create table player_performances (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  runs integer default 0,
  balls_faced integer default 0,
  fours integer default 0,
  sixes integer default 0,
  wickets integer default 0,
  overs_bowled decimal(3,1) default 0.0,
  runs_conceded integer default 0,
  maiden_overs integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(match_id, player_id)
);

-- Match Active State (Live Scorer Node)
create table match_active_state (
  match_id uuid references matches(id) on delete cascade primary key,
  batting_team_id uuid references teams(id) on delete cascade not null,
  striker_id uuid references players(id) on delete set null,
  non_striker_id uuid references players(id) on delete set null,
  bowler_id uuid references players(id) on delete set null,
  innings_no integer default 1,
  current_over integer default 0,
  current_ball integer default 0,
  last_event_id uuid references match_events(id) on delete set null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ENABLE RLS & POLICIES (Full Public Access for MVP)
do $$
declare
    t text;
begin
    for t in select table_name 
             from information_schema.tables 
             where table_schema = 'public' 
             and table_type = 'BASE TABLE'
    loop
        execute format('alter table %I enable row level security', t);
        execute format('drop policy if exists "Public Full Access" on %I', t);
        execute format('create policy "Public Full Access" on %I for all using (true) with check (true)', t);
    end loop;
end $$;
