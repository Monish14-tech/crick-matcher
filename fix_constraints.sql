-- =====================================================
-- CRICKET MATCHER - FOREIGN KEY REPAIR (FINAL)
-- =====================================================
-- Run this script to fix "Violates foreign key constraint" errors.
-- It ensures that deleting a Team deletes all their Matches/History
-- without getting blocked by 'toss_winner' or 'winner' references.
-- =====================================================

-- 1. PLAYERS -> TEAMS
alter table players drop constraint if exists players_team_id_fkey;
alter table players add constraint players_team_id_fkey 
  foreign key (team_id) references teams(id) on delete cascade;

-- 2. MATCHES -> TEAMS (Team A)
alter table matches drop constraint if exists matches_team_a_id_fkey;
alter table matches add constraint matches_team_a_id_fkey 
  foreign key (team_a_id) references teams(id) on delete cascade;

-- 3. MATCHES -> TEAMS (Team B)
alter table matches drop constraint if exists matches_team_b_id_fkey;
alter table matches add constraint matches_team_b_id_fkey 
  foreign key (team_b_id) references teams(id) on delete cascade;

-- 4. MATCHES -> TEAMS (Toss Winner - Fix Blockers)
alter table matches drop constraint if exists matches_toss_winner_id_fkey;
alter table matches add constraint matches_toss_winner_id_fkey 
  foreign key (toss_winner_id) references teams(id) on delete set null;

-- 5. MATCHES -> TEAMS (Winner - Fix Blockers)
alter table matches drop constraint if exists matches_winner_id_fkey;
alter table matches add constraint matches_winner_id_fkey 
  foreign key (winner_id) references teams(id) on delete set null;

-- 6. MATCH EVENTS -> MATCHES
alter table match_events drop constraint if exists match_events_match_id_fkey;
alter table match_events add constraint match_events_match_id_fkey 
  foreign key (match_id) references matches(id) on delete cascade;

-- 7. MATCH SCORES -> MATCHES
alter table match_scores drop constraint if exists match_scores_match_id_fkey;
alter table match_scores add constraint match_scores_match_id_fkey 
  foreign key (match_id) references matches(id) on delete cascade;

-- 8. PLAYER PERFORMANCES -> MATCHES
alter table player_performances drop constraint if exists player_performances_match_id_fkey;
alter table player_performances add constraint player_performances_match_id_fkey 
  foreign key (match_id) references matches(id) on delete cascade;

-- 9. MATCH ACTIVE STATE
alter table match_active_state drop constraint if exists match_active_state_match_id_fkey;
alter table match_active_state add constraint match_active_state_match_id_fkey 
  foreign key (match_id) references matches(id) on delete cascade;

select 'All Constraints Updated for Safe Deletion' as status;
