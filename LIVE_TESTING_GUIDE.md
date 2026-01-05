# 🔍 Live Testing Guide - Quick Visual Inspection

## Current Status
- **Server:** Running at http://localhost:3000
- **Current Page:** Teams page
- **Time:** 2026-01-05 11:37 IST

---

## 🎯 STEP-BY-STEP LIVE TEST

### Step 1: Navigate to Admin Portal
1. Go to: `http://localhost:3000/admin`
2. **Check for:**
   - [ ] "Reset Data" button (red, with trash icon)
   - [ ] "Recent Match Activity" section
   - [ ] "Score" button on matches

**Expected:** Admin dashboard loads with all buttons visible

**If Failed:**
- Check console for errors (F12)
- Verify Supabase connection in `.env.local`

---

### Step 2: Create or Select a Match
1. Click "Schedule Match" OR click "Score" on existing match
2. **Check for:**
   - [ ] Match creation form loads
   - [ ] Team selection dropdowns work
   - [ ] Date/Time pickers functional

**Expected:** Can create/access match

**If Failed:**
- Ensure teams exist (go to /admin/teams)
- Check if grounds exist
- Verify database tables are created

---

### Step 3: Start Scoring
1. Navigate to: `/admin/matches/[id]/score`
2. **Check for:**
   - [ ] Toss selection screen appears (if new match)
   - [ ] Can select toss winner
   - [ ] Can select batting team
   - [ ] "Confirm Toss & Start Match" button works

**Expected:** Toss selection → Player selection

**If Failed:**
- Check if match status is "Scheduled"
- Verify teams have players
- Check console for Supabase errors

---

### Step 4: Select Players
1. After toss, select:
   - [ ] Striker (from batting team)
   - [ ] Non-Striker (from batting team, different player)
   - [ ] Bowler (from bowling team)
2. Click "Lock Selection & Continue"

**Expected:** Scoring buttons appear

**If Failed:**
- Ensure all 3 selections are made
- Check if players exist for both teams
- Verify `match_active_state` table exists

---

### Step 5: Test Scoring Buttons
1. **Check all buttons visible:**
   - [ ] 0, 1, 2, 3, 4, 6 (run buttons)
   - [ ] WD (Wide)
   - [ ] NB (No Ball)
   - [ ] BYE
   - [ ] LB (Leg Bye)
   - [ ] WICKET (red button)

2. **Click "1" run:**
   - [ ] Score increases by 1
   - [ ] Ball count increases (0.0 → 0.1)
   - [ ] Striker and non-striker SWAP positions
   - [ ] Event appears in timeline

**Expected:** All buttons work, striker rotation happens

**If Failed:**
- Check browser console for JavaScript errors
- Verify `logBall` function is working
- Check if `match_events` table exists

---

### Step 6: Test Wide Ball
1. Click "WD" button
2. **Check:**
   - [ ] Score increases by 1
   - [ ] Ball count STAYS THE SAME (e.g., stays at 0.1)
   - [ ] Event shows "Wide" in timeline

**Expected:** Wide adds run but doesn't count as ball

**If Failed:**
- Check `isExtraBall` logic in code
- Verify `extra_type` is being set correctly

---

### Step 7: Complete an Over
1. Bowl 6 legal balls (avoid WD/NB)
2. **Check:**
   - [ ] After 6th ball, over changes (0.6 → 1.0)
   - [ ] Batters swap automatically
   - [ ] Bowler selection popup appears
   - [ ] Previous bowler is disabled

**Expected:** Over completion triggers bowler change

**If Failed:**
- Check `nextBall >= 6` logic
- Verify bowler rotation is implemented

---

### Step 8: Test Wicket
1. Click "WICKET" button
2. **Check:**
   - [ ] Wicket count increases
   - [ ] Batter selection popup appears
   - [ ] Out batter is removed from dropdown
   - [ ] Timeline shows wicket event

**Expected:** Wicket logic works correctly

**If Failed:**
- Check `isWicket` parameter in `logBall`
- Verify `outPlayerIds` state is updating

---

### Step 9: Test 10-Wicket Limit
1. Click WICKET 10 times (select new batter each time)
2. **Check:**
   - [ ] After 10th wicket, Innings Summary appears
   - [ ] Shows "All out" as reason
   - [ ] Displays batting scorecard
   - [ ] Displays bowling scorecard

**Expected:** Innings ends automatically at 10 wickets

**If Failed:**
- Check `maxWickets = 10` in code
- Verify `isAllOut` condition
- Check if `InningsSummary` component renders

---

### Step 10: Check Innings Summary
1. View the summary screen
2. **Check for:**
   - [ ] Final score (Runs/Wickets)
   - [ ] Overs played
   - [ ] Run rate
   - [ ] Batting table (Batter, R, B, 4s/6s, SR)
   - [ ] Bowling table (Bowler, O, R, W, Dots, Eco)
   - [ ] "Switch Sides & Start 2nd Innings" button

**Expected:** Complete statistics displayed

**If Failed:**
- Check `batterStats` and `bowlerStats` calculations
- Verify table rendering in `InningsSummary`

---

### Step 11: Test Second Innings
1. Click "Switch Sides & Start 2nd Innings"
2. **Check:**
   - [ ] Target is displayed (First Innings + 1)
   - [ ] Shows "Need X runs from Y balls"
   - [ ] Player selection appears for new batting team

**Expected:** Second innings starts with target

**If Failed:**
- Check `handleNextInnings` function
- Verify `targetScore` calculation

---

### Step 12: Test Match Result
1. In 2nd innings, reach the target
2. **Check:**
   - [ ] Match ends immediately
   - [ ] Result shows: "Team won by X wickets"
   - [ ] Correct team name
   - [ ] Correct wickets remaining

**Expected:** Accurate result message

**If Failed:**
- Check result calculation logic
- Verify `battingTeamName` and `bowlingTeamName`

---

### Step 13: Test Reset Score
1. Click "Reset Score" button (in header)
2. **Check:**
   - [ ] Confirmation prompt appears
   - [ ] After confirm, match resets to "Scheduled"
   - [ ] Teams and players are NOT deleted
   - [ ] Only match data is cleared

**Expected:** Match-specific reset only

**If Failed:**
- Check `handleResetMatchScore` function
- Verify it only deletes from match-specific tables

---

### Step 14: Test Reset Data (Admin)
1. Go to `/admin`
2. Click "Reset Data" button
3. **Check:**
   - [ ] CRITICAL WARNING appears
   - [ ] Cancel button works
   - [ ] (Don't actually confirm - this deletes everything!)

**Expected:** Strong warning, cancel works

**If Failed:**
- Check `handleResetAllData` in admin page
- Verify confirmation dialog

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: "Supabase client not initialized"
**Fix:**
```bash
# Check .env.local file exists
# Verify these variables are set:
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Issue 2: "No teams found"
**Fix:**
```bash
# Go to /admin/teams
# Click "Add Team"
# Create at least 2 teams with players
```

### Issue 3: "Table does not exist"
**Fix:**
```sql
-- Run in Supabase SQL Editor:
-- 1. schema.sql
-- 2. schema_v2.sql
-- 3. schema_ball_by_ball.sql
```

### Issue 4: "Delete permission denied"
**Fix:**
```sql
-- Run in Supabase SQL Editor:
-- Enable delete policies for all tables
-- See: fix_delete_permissions.sql
```

### Issue 5: Buttons not appearing
**Fix:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Check if match is in correct state

### Issue 6: Score not updating
**Fix:**
- Check browser console for errors
- Verify Supabase connection
- Check if `match_scores` table exists

---

## 📊 EXPECTED RESULTS

### ✅ All Working:
- All buttons visible and clickable
- Score updates in real-time
- Striker rotation on odd runs
- Extras don't count as balls
- Overs complete at 6 balls
- Innings ends at 10 wickets
- Statistics display correctly
- Match result is accurate

### ⚠️ Warnings (Normal):
- Player selection hidden after locking
- Some buttons disabled based on state
- Timeline empty before first ball

### ❌ Critical Issues:
- Buttons completely missing
- Score not updating at all
- Console shows red errors
- Page crashes on button click

---

## 🎯 QUICK BROWSER TEST

**Run this in browser console (F12):**

```javascript
// Copy content of live_browser_test.js
// Then run:
runLiveTest()
```

This will automatically check all UI elements and provide specific suggestions.

---

## 📞 NEED HELP?

1. **Check Console:** F12 → Console tab (look for red errors)
2. **Check Network:** F12 → Network tab (look for failed requests)
3. **Check Database:** Supabase Dashboard → Table Editor
4. **Check Logs:** Terminal running `npm run dev`

---

**Last Updated:** 2026-01-05 11:37 IST  
**Status:** Ready for testing
