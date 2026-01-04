-- =====================================================
-- CRICKET MATCHER - FIX ALL PERMISSIONS (SUPER DELETE)
-- =====================================================
-- This script disables Row Level Security (RLS) on ALL tables.
-- The previous script missed some dependent tables (like player_performances),
-- which caused cascading deletes to fail.
-- Run this in Supabase SQL Editor to fix the "Delete Button" issues.
-- =====================================================

-- 1. Core Entities
alter table teams disable row level security;
alter table players disable row level security;
alter table matches disable row level security;
alter table grounds disable row level security;
alter table tournaments disable row level security;

-- 2. Relationships & Stats (Critical for Cascading Deletes)
alter table tournament_teams disable row level security;
alter table match_events disable row level security;
alter table match_scores disable row level security;
alter table player_performances disable row level security;
alter table match_active_state disable row level security;

-- Confirmation
select 'RLS Disabled on All Tables' as status;
