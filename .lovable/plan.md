

## Plan: Show User's Rank Below Top 10 (Duolingo-style)

### Overview
Add the current user's rank at the bottom of the leaderboard if they are not in the top 10. The top 10 renders normally, then a visual separator with blurred/faded placeholder rows suggests more users exist, followed by the user's own rank row pinned at the bottom.

### Changes

#### 1. `src/services/challengeService.ts` - Add `getUserRank` method
- New function that queries `user_stats` to count how many users have higher `monthly_xp` than the current user, returning their rank and monthly XP.
- Uses a simple count query: `SELECT count(*) FROM user_stats WHERE monthly_xp > currentUserMonthlyXp` then rank = count + 1.
- Also fetch the user's profile (first_name, avatar_url) and stats to build a `LeaderboardEntry`.

#### 2. `src/pages/Challenge.tsx` - Leaderboard tab updates
- Call `getUserRank` during `loadInitialData` and store in state (`userRank: LeaderboardEntry | null`).
- In the leaderboard tab, after the top 10 list:
  - Check if the current user is already in the top 10 (by matching `user_id`).
  - If NOT in top 10, render:
    1. **3 blurred placeholder rows** - fake entries with blurred text and avatars (no real data loaded), using `blur-sm opacity-40` classes to indicate hidden ranks.
    2. **A separator** with "..." or a subtle divider.
    3. **The user's own rank row** - styled with a highlighted background (`bg-primary/10 border border-primary/30`) showing their rank number, avatar, name with "YOU" badge, streak, and monthly XP. Pinned/sticky feel.

### Technical Details

**New service method:**
```typescript
async getUserRank(userId: string): Promise<LeaderboardEntry | null>
```
- Queries `user_stats` for the user's `monthly_xp`, `current_streak`
- Counts users with higher `monthly_xp` to determine rank
- Fetches profile data for avatar/name
- Returns a `LeaderboardEntry` with computed rank

**UI structure in leaderboard tab:**
```text
┌─────────────────────────────┐
│ #1  👤 Alice      120 XP    │
│ #2  👤 Bob        100 XP    │
│ ...                          │
│ #10 👤 Jane        40 XP    │
├─────────────────────────────┤
│ ░░░ ▓▓▓▓▓▓▓     ░░░ XP     │  ← blurred row
│ ░░░ ▓▓▓▓▓▓▓     ░░░ XP     │  ← blurred row
│ ░░░ ▓▓▓▓▓▓▓     ░░░ XP     │  ← blurred row
│          · · ·               │
├─────────────────────────────┤
│ #47 👤 You ★      15 XP     │  ← highlighted user row
└─────────────────────────────┘
```

### Files Modified
1. **`src/services/challengeService.ts`** - Add `getUserRank()` method
2. **`src/pages/Challenge.tsx`** - Add user rank state, blurred rows, and pinned user row in leaderboard

