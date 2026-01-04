-- =====================================================
-- CRICKET MATCHER - APPLY LOGIC UPDATES (SAFE MODE)
-- =====================================================
-- This script updates the database functions and triggers ONLY.
-- It does NOT drop your tables or data.
-- Run this in the Supabase SQL Editor to apply the latest logic fixes:
-- 1. Dynamic "All Out" logic (Total Players - 1)
-- 2. Correct Target Score logic (Runs >= Target)
-- 3. Custom Overs support (e.g. "15 Overs")
-- =====================================================

-- 1. Helper Function: Get Total Overs
create or replace function get_total_overs(p_overs_type text)
returns integer as $$
declare
  v_overs integer;
begin
  if p_overs_type = 'T20' then
    return 20;
  elsif p_overs_type = 'ODI' then
    return 50;
  else
    -- Try to extract number from custom format (e.g., "15 Overs")
    v_overs := (regexp_match(p_overs_type, '(\d+)'))[1]::integer;
    if v_overs is not null then
      return v_overs;
    else
      return 20; -- Default fallback
    end if;
  end if;
end;
$$ language plpgsql immutable;


-- 2. Function: Check if Innings Should End
create or replace function check_innings_end(
  p_match_id uuid,
  p_innings_no integer,
  p_wickets integer,
  p_overs decimal,
  p_runs integer
)
returns boolean as $$
declare
  v_total_overs integer;
  v_target_score integer;
  v_is_innings_end boolean := false;
  v_batting_team_id uuid;
  v_total_players integer;
  v_max_wickets integer;
begin
  -- Get match overs type
  select get_total_overs(overs_type) into v_total_overs
  from matches where id = p_match_id;
  
  -- Get batting team and calculate max wickets
  select batting_team_id into v_batting_team_id
  from match_active_state 
  where match_id = p_match_id;
  
  if v_batting_team_id is not null then
      select count(*) into v_total_players
      from players 
      where team_id = v_batting_team_id;
      
      v_max_wickets := GREATEST(1, v_total_players - 1);
  else
      v_max_wickets := 10; -- Fallback
  end if;
  
  -- Check if all out (Dynamic Wickets)
  if p_wickets >= v_max_wickets then
    v_is_innings_end := true;
  end if;
  
  -- Check if overs completed
  if p_overs >= v_total_overs then
    v_is_innings_end := true;
  end if;
  
  -- For 2nd innings, check if target reached
  if p_innings_no = 2 then
    select runs_scored into v_target_score
    from match_scores
    where match_id = p_match_id and is_first_innings = true;
    
    if v_target_score is not null then
       v_target_score := v_target_score + 1; -- Target is First Innings + 1
       
       if p_runs >= v_target_score then
         v_is_innings_end := true;
       end if;
    end if;
  end if;
  
  return v_is_innings_end;
end;
$$ language plpgsql;


-- 3. Function: Update Match Status Based on Innings
create or replace function update_match_status()
returns trigger as $$
declare
  v_innings_no integer;
  v_is_innings_end boolean;
begin
  -- Get current innings number
  select innings_no into v_innings_no
  from match_active_state
  where match_id = new.match_id;
  
  -- Check if innings should end
  v_is_innings_end := check_innings_end(
    new.match_id,
    v_innings_no,
    new.wickets_lost,
    new.overs_played,
    new.runs_scored
  );
  
  -- If 2nd innings ends, mark match as completed
  if v_is_innings_end and v_innings_no = 2 then
    update matches
    set status = 'Completed'
    where id = new.match_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- 4. Re-Apply Triggers (Safe Drop & Create)
drop trigger if exists trigger_update_match_status on match_scores;
create trigger trigger_update_match_status
  after insert or update on match_scores
  for each row
  execute function update_match_status();
