-- Ball by Ball Events Table
create table if not exists match_events (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  innings_no integer not null, -- 1 or 2
  over_no integer not null, -- 0-based or 1-based (over number)
  ball_no integer not null, -- 1-6
  batter_id uuid references players(id) not null,
  bowler_id uuid references players(id) not null,
  non_striker_id uuid references players(id) not null,
  runs_batter integer default 0,
  runs_extras integer default 0,
  extra_type text check (extra_type in ('Wide', 'No Ball', 'Bye', 'Leg Bye', 'Penalty')),
  wicket_type text check (wicket_type in ('Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket', 'Handled Ball', 'Timed Out', 'Obs. Field', 'Retired')),
  player_out_id uuid references players(id),
  commentary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Active Match State (to keep track of current strikers/bowler)
create table if not exists match_active_state (
  match_id uuid references matches(id) on delete cascade primary key,
  batting_team_id uuid references teams(id) not null,
  striker_id uuid references players(id),
  non_striker_id uuid references players(id),
  bowler_id uuid references players(id),
  innings_no integer default 1,
  current_over integer default 0,
  current_ball integer default 0,
  last_event_id uuid references match_events(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table match_events enable row level security;
alter table match_active_state enable row level security;

-- Policies
create policy "Allow public read on match_events" on match_events for select using (true);
create policy "Allow public insert on match_events" on match_events for insert with check (true);
create policy "Allow public update on match_events" on match_events for update using (true);

create policy "Allow public read on match_active_state" on match_active_state for select using (true);
create policy "Allow public insert on match_active_state" on match_active_state for insert with check (true);
create policy "Allow public update on match_active_state" on match_active_state for update using (true);
