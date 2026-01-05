# Match Details Display Bug Fix

## Problem
The match details page was displaying incorrect match results after a completed match. Specifically:
- Winner was shown incorrectly
- Result showed negative runs (e.g., "WON BY -1 Runs")
- The "won by wickets" vs "won by runs" logic was backwards

## Root Causes Identified

### 1. **Winner Determination Logic Error** (Primary Issue)
**Location:** `app/admin/matches/[id]/score/page.tsx` lines 383-394

**Problem:** The tie-check logic was placed AFTER setting the defending team as winner, which meant:
- If the chasing team scored exactly `targetScore - 1` (one run short), the code would first set the defending team as winner
- Then it would check if it's a tie and set `winnerId = null`
- This created a race condition where the wrong team could be marked as winner

**Fix:** Reordered the logic to check for tie BEFORE assigning the defending team as winner:
```typescript
if (targetScore && newTotalRuns >= targetScore) {
    // Chasing team reached or exceeded target
    winnerId = activeState.batting_team_id
} else if (targetScore && newTotalRuns + 1 === targetScore) {
    // Tie: chasing team's score equals first innings score
    winnerId = null
} else if (targetScore) {
    // Defending team won (chasing team fell short)
    winnerId = activeState.batting_team_id === match.team_a_id ? match.team_b_id : match.team_a_id
}
```

### 2. **Wicket Difference Calculation Error**
**Location:** `app/matches/[id]/page.tsx` line 195

**Problem:** The code was calculating wickets remaining using the LOSER's wickets instead of the WINNER's wickets:
```typescript
const wicketDifference = loserScore ? 10 - loserScore.wickets_lost : 0
```

**Fix:** Changed to use the winner's wickets (since the winner chased successfully):
```typescript
const wicketDifference = winnerScore ? 10 - winnerScore.wickets_lost : 0
```

## How the Fix Works

### Winner Determination (Second Innings)
1. **Target Reached:** If chasing team scores >= target → Chasing team wins
2. **Tie:** If chasing team scores exactly (target - 1) → It's a tie (both teams scored the same)
3. **Fell Short:** If chasing team scores < (target - 1) → Defending team wins

### Result Display
- **Winner batted FIRST** (`is_first_innings = true`) → Won by RUNS (defended their total)
- **Winner batted SECOND** (`is_first_innings = false`) → Won by WICKETS (chased successfully)

## Testing Recommendations

1. **Test Case 1: Normal Win by Runs**
   - Team A: 150/8 (20 overs)
   - Team B: 140/10 (18 overs)
   - Expected: "Team A won by 10 runs" ✅

2. **Test Case 2: Normal Win by Wickets**
   - Team A: 150/8 (20 overs)
   - Team B: 151/5 (18 overs)
   - Expected: "Team B won by 5 wickets" ✅

3. **Test Case 3: Tie**
   - Team A: 150/8 (20 overs)
   - Team B: 150/10 (20 overs)
   - Expected: "Match Tied" or no winner displayed ✅

4. **Test Case 4: Close Win**
   - Team A: 23/0 (1 over)
   - Team B: 22/1 (1 over)
   - Expected: "Team A won by 1 run" ✅ (This was the bug in the screenshot)

## Files Modified

1. **`app/admin/matches/[id]/score/page.tsx`**
   - Fixed winner determination logic in second innings
   - Reordered tie-check to prevent incorrect winner assignment

2. **`app/matches/[id]/page.tsx`**
   - Fixed wicket difference calculation to use winner's wickets
   - Display logic for "won by runs/wickets" was already correct

## Status
✅ **FIXED** - The match details page should now correctly display:
- Correct winner
- Positive run/wicket differences
- Proper "won by runs" vs "won by wickets" text
