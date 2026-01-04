
-- Match Scores Table
create table if not exists match_scores (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  team_id uuid references teams(id) not null,
  runs_scored integer default 0,
  wickets_lost integer default 0,
  overs_played decimal(3,1) default 0.0,
  is_first_innings boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(match_id, team_id)
);

-- Player Performance Table
create table if not exists player_performances (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  team_id uuid references teams(id) not null,
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

-- Tournaments Table
create table if not exists tournaments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  start_date date,
  end_date date,
  status text default 'Upcoming' check (status in ('Upcoming', 'Ongoing', 'Completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tournament Teams Junction Table
create table if not exists tournament_teams (
  tournament_id uuid references tournaments(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  primary key (tournament_id, team_id)
);

-- Add tournament_id to matches
alter table matches add column if not exists tournament_id uuid references tournaments(id);

-- Enable RLS
alter table match_scores enable row level security;
alter table player_performances enable row level security;
alter table tournaments enable row level security;
alter table tournament_teams enable row level security;

-- Policies
create policy "Allow public read on match_scores" on match_scores for select using (true);
create policy "Allow public insert on match_scores" on match_scores for insert with check (true);
create policy "Allow public update on match_scores" on match_scores for update using (true);

create policy "Allow public read on player_performances" on player_performances for select using (true);
create policy "Allow public insert on player_performances" on player_performances for insert with check (true);
create policy "Allow public update on player_performances" on player_performances for update using (true);

create policy "Allow public read on tournaments" on tournaments for select using (true);
create policy "Allow public insert on tournaments" on tournaments for insert with check (true);

create policy "Allow public read on tournament_teams" on tournament_teams for select using (true);
create policy "Allow public insert on tournament_teams" on tournament_teams for insert with check (true);
