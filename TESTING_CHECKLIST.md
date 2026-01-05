# Cricket Matcher - Complete Testing Checklist

## 🎯 Testing Status Report
**Date:** 2026-01-05  
**Version:** Professional Cricket Rules Implementation  
**Localhost:** http://localhost:3000

---

## ✅ CORE CRICKET RULES TESTING

### 1. Striker Rotation (Odd Runs)
- [ ] Score 1 run
- [ ] Verify striker and non-striker swap positions
- [ ] Score 3 runs
- [ ] Verify swap happens again
- [ ] Score 2 runs (even)
- [ ] Verify NO swap occurs

**Expected Result:** Batters swap only on odd runs (1, 3, 5)

---

### 2. Extras Don't Count as Balls
- [ ] Note current over (e.g., 0.3)
- [ ] Click "WD" (Wide)
- [ ] Verify score increases by 1
- [ ] Verify over stays at 0.3 (doesn't become 0.4)
- [ ] Click "NB" (No Ball)
- [ ] Verify same behavior

**Expected Result:** Wides and No Balls add runs but don't increment ball count

---

### 3. Over Completion (6 Legal Balls)
- [ ] Bowl 6 legal deliveries (avoid WD/NB)
- [ ] After 6th ball, verify over changes (0.6 → 1.0)
- [ ] Verify batters swap automatically
- [ ] Verify bowler selection popup appears
- [ ] Verify previous bowler is disabled

**Expected Result:** Over increments after exactly 6 legal balls

---

### 4. 10-Wicket Limit (All Out)
- [ ] Click "WICKET" button
- [ ] Select new batter from dropdown
- [ ] Repeat 9 more times (total 10 wickets)
- [ ] After 10th wicket, verify Innings Summary appears
- [ ] Verify reason shows "All out"
- [ ] Verify no batter selection appears

**Expected Result:** Innings ends automatically after 10 wickets

---

### 5. Overs Quota Complete
- [ ] Create a T10 match (10 overs)
- [ ] Bowl until Over 10.0
- [ ] Verify Innings Summary appears
- [ ] Verify reason shows "Overs completed"

**Expected Result:** Innings ends when overs quota is met

---

### 6. Second Innings Target
- [ ] Complete first innings (e.g., 150 runs)
- [ ] Click "Switch Sides & Start 2nd Innings"
- [ ] Verify target shows as 151 (first innings + 1)
- [ ] Verify UI shows "Need 151 runs"
- [ ] Verify target counter updates after each ball

**Expected Result:** Target = First Innings Score + 1

---

### 7. Match Result - Win by Wickets
- [ ] In 2nd innings, reach the target
- [ ] Verify match ends immediately
- [ ] Verify result: "[Team] won by X wickets"
- [ ] Verify X = 10 - wickets lost

**Expected Result:** Correct wickets-based victory message

---

### 8. Match Result - Win by Runs
- [ ] In 2nd innings, get all out before target
- [ ] Verify result: "[Bowling Team] won by X runs"
- [ ] Verify X = (Target - 1) - Current Score

**Expected Result:** Correct runs-based victory message

---

### 9. Tied Match
- [ ] In 2nd innings, score exactly (Target - 1)
- [ ] Get all out or complete overs
- [ ] Verify result shows "Match Tied"

**Expected Result:** Tie is correctly identified

---

## 📊 INNINGS SUMMARY STATISTICS

### 10. Batting Scorecard
- [ ] End innings and view summary
- [ ] Verify table shows all batters who played
- [ ] Check columns: Batter, R (Runs), B (Balls), 4s/6s, SR (Strike Rate)
- [ ] Verify Strike Rate = (Runs/Balls) × 100
- [ ] Verify boundaries count is accurate

**Expected Result:** Complete batting statistics table

---

### 11. Bowling Scorecard
- [ ] In Innings Summary, scroll to bowling table
- [ ] Check columns: Bowler, O (Overs), R (Runs), W (Wickets), Dots, Eco (Economy)
- [ ] Verify Overs format: X.Y (e.g., 3.2 = 3 overs + 2 balls)
- [ ] Verify Economy = Runs / (Balls ÷ 6)
- [ ] Verify dot balls count

**Expected Result:** Complete bowling statistics table

---

## 🔘 FUNCTIONAL BUTTONS TESTING

### 12. Reset Score Button (Live Scoring)
- [ ] Navigate to /admin/matches/[id]/score
- [ ] Verify "Reset Score" button in header
- [ ] Click button
- [ ] Verify confirmation: "Reset Match Scoring?"
- [ ] Confirm reset
- [ ] Verify match returns to "Scheduled" status
- [ ] Verify teams/players are NOT deleted
- [ ] Verify only match data is cleared

**Expected Result:** Match-specific reset only

---

### 13. Reset Data Button (Admin Portal)
- [ ] Navigate to /admin
- [ ] Verify "Reset Data" button in header (red, trash icon)
- [ ] Click button
- [ ] Verify critical warning appears
- [ ] Cancel (don't actually delete)
- [ ] Verify nothing was deleted

**Expected Result:** System-wide reset with strong warning

---

### 14. Undo Button
- [ ] Score a ball (e.g., 4 runs)
- [ ] Click "Undo" button
- [ ] Verify confirmation prompt
- [ ] Confirm undo
- [ ] Verify score reverts
- [ ] Verify ball count reverts
- [ ] Verify last event removed from timeline

**Expected Result:** Last ball is undone correctly

---

### 15. End Innings Button
- [ ] During active innings, click "End Inn"
- [ ] Verify confirmation prompt
- [ ] Confirm
- [ ] Verify Innings Summary appears
- [ ] If 1st innings, verify "Next Innings" button
- [ ] If 2nd innings, verify match ends

**Expected Result:** Manual innings end works correctly

---

### 16. Scoring Buttons (0-6)
- [ ] Verify all buttons present: 0, 1, 2, 3, 4, 6
- [ ] Click each button
- [ ] Verify score updates correctly
- [ ] Verify ball count increments
- [ ] Verify timeline shows event

**Expected Result:** All run buttons functional

---

### 17. Extra Buttons (WD, NB, BYE, LB)
- [ ] Click "WD" (Wide)
- [ ] Verify 1 run added, ball count unchanged
- [ ] Click "NB" (No Ball)
- [ ] Verify 1 run added, ball count unchanged
- [ ] Click "BYE"
- [ ] Verify runs added to extras, not batter
- [ ] Click "LB" (Leg Bye)
- [ ] Verify same as BYE

**Expected Result:** All extra buttons work per cricket rules

---

### 18. Wicket Button
- [ ] Click "WICKET"
- [ ] Verify batter selection popup appears
- [ ] Select new batter
- [ ] Verify wicket count increments
- [ ] Verify out batter removed from selection
- [ ] Verify timeline shows wicket event

**Expected Result:** Wicket logic works correctly

---

## 🎮 PLAYER SELECTION

### 19. Toss Selection
- [ ] Start new match
- [ ] Verify toss winner selection (2 teams)
- [ ] Verify batting first selection (2 teams)
- [ ] Click "Confirm Toss & Start Match"
- [ ] Verify match status changes to "Live"

**Expected Result:** Toss selection works

---

### 20. Player Selection (Striker/Non-Striker/Bowler)
- [ ] After toss, verify 3 dropdowns appear
- [ ] Select Striker from Team A
- [ ] Select Non-Striker from Team A (different player)
- [ ] Select Bowler from Team B
- [ ] Click "Lock Selection & Continue"
- [ ] Verify scoring buttons appear

**Expected Result:** Player selection enforced correctly

---

### 21. Bowler Change After Over
- [ ] Complete an over (6 balls)
- [ ] Verify bowler selection popup
- [ ] Verify previous bowler is disabled
- [ ] Select new bowler
- [ ] Verify scoring continues

**Expected Result:** Bowler rotation enforced

---

## 📱 UI/UX ELEMENTS

### 22. Live Node Indicator
- [ ] Verify "Live Node" badge in header
- [ ] Verify it shows pulsing animation
- [ ] Verify it's visible during active scoring

**Expected Result:** Live status indicator present

---

### 23. Score Display
- [ ] Verify score shows as: Runs/Wickets (e.g., 45/3)
- [ ] Verify over shows as: X.Y (e.g., 5.3)
- [ ] Verify CRR (Current Run Rate) displays
- [ ] Verify target (in 2nd innings) displays

**Expected Result:** All score metrics visible

---

### 24. Timeline/Recent Events
- [ ] Verify "Live Timeline" panel on right
- [ ] Score a ball
- [ ] Verify event appears at top
- [ ] Verify event shows: Over.Ball, Batter, Bowler, Outcome
- [ ] Verify delete button (trash icon) on hover

**Expected Result:** Live event feed works

---

### 25. Player Stats (Live)
- [ ] Verify striker shows: Runs (Balls), SR
- [ ] Verify non-striker shows: Runs (Balls), SR
- [ ] Verify bowler shows: Wickets-Runs, Overs
- [ ] Score a ball
- [ ] Verify stats update in real-time

**Expected Result:** Live player stats accurate

---

## 🔗 NAVIGATION & INTEGRATION

### 26. Admin Dashboard
- [ ] Navigate to /admin
- [ ] Verify "Recent Match Activity" section
- [ ] Verify "Score" button for each match
- [ ] Click "Score" button
- [ ] Verify navigates to scoring page

**Expected Result:** Dashboard integration works

---

### 27. Match Details Page
- [ ] Navigate to /matches/[id]
- [ ] Verify scorecard displays
- [ ] Verify player performances show
- [ ] Verify match result (if completed)

**Expected Result:** Public match view works

---

### 28. Schedule Page
- [ ] Navigate to /schedule
- [ ] Verify all matches listed
- [ ] Verify match status (Scheduled/Live/Completed)
- [ ] Click on a match
- [ ] Verify navigates to match details

**Expected Result:** Schedule integration works

---

## 🎯 FINAL VERIFICATION

### Test Summary
- **Total Tests:** 28
- **Passed:** ___
- **Failed:** ___
- **Warnings:** ___

### Critical Issues Found:
1. 
2. 
3. 

### Non-Critical Issues:
1. 
2. 
3. 

### Recommendations:
1. 
2. 
3. 

---

## 🚀 AUTOMATED TEST EXECUTION

To run automated browser tests:
1. Open browser console on scoring page
2. Copy and paste: `test_cricket_rules.js` content
3. Run: `runTests()`
4. Review console output

---

**Tester:** _________________  
**Date:** _________________  
**Status:** ⬜ All Pass | ⬜ Minor Issues | ⬜ Major Issues
