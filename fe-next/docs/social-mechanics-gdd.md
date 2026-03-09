# LexiClash Social Mechanics — Game Design Document

**Version**: 1.0
**Date**: 2026-03-10
**Author**: Game Design Audit
**Scope**: Social engagement improvements for a competitive word game with 5 modes (Classic, Blast, Word Hunt, Daily Challenge, Multiplayer real-time)

---

## Executive Summary

LexiClash has a solid social foundation: friend lists with presence, direct messaging, 1v1 head-to-head records, challenge invites, room chat, and leaderboards. The infrastructure (Socket.IO, Supabase `friends`/`head_to_head`/`friend_challenges` tables, real-time presence) is mature and ready for expansion.

**The core gap**: All current social mechanics are transactional and competitive. There is no cooperative play, no persistent social identity shared between friends, no social rituals, and no asynchronous challenge loop. Friends are managed but not meaningfully bonded through play.

**Opportunity**: Word games have naturally high social lift potential because word discovery is conversational and shareable. The existing Share button and EmojiShareCard are the only social virality vectors today.

---

## Current State Audit

### What Exists

| Feature | Location | State |
|---|---|---|
| Friends list + presence | `components/friends/FriendsList.tsx` | Shipped |
| Direct messaging | `components/friends/messaging/` | Shipped |
| Head-to-head W/L/D record | `utils/friendsHeadToHead.ts` `head_to_head` table | Shipped |
| Challenge invites (new game / join room) | `shared/types/friends.ts` `Challenge` type | Shipped |
| Room chat | Backend `chatHandler` | Shipped |
| Daily leaderboard (today + all-time) | `components/daily/TabbedDailyLeaderboard.tsx` | Shipped |
| In-game leaderboard | `components/results/Top3Leaderboard.tsx` | Shipped |
| Series standings (multi-round) | `components/results/SeriesStandingsBanner.tsx` | Shipped |
| Score sharing (copy/clipboard) | `components/results/ShareButton.tsx` | Shipped |
| Friend profile dialog | `components/friends/FriendDetailDialog.tsx` | Shipped — minimal (shows level + total games only) |
| Close-loss rematch prompt | `components/results/NextStepPrompt.tsx` | Shipped |
| Streaks | `components/daily/landing/StreakCounter.tsx` | Daily only, personal only |

### What Is Missing

- No cooperative play modes
- No friend-group social identity (no clans, squads, or shared progression)
- No spectating or live watching
- No asynchronous "beat my score" challenge
- No social reward bonuses (playing with friends gives nothing extra)
- No weekly/seasonal friend leagues
- No friend activity feed
- No friend streak (maintaining connection through daily play together)
- Head-to-head record is visible but has no narrative weight or milestones
- FriendDetailDialog shows only level + total games; no shared history display
- Challenge type `gameSettings.mode` field exists but mode is never surfaced in the UI invite

---

## Design Proposals — Prioritized

Priority order balances engagement impact, implementation risk, and build on existing infrastructure.

---

### 1. Asynchronous "Beat My Score" Challenge

**Priority**: P0
**Effort**: S
**Engagement Impact**: 5/5

**Design**

After any singleplayer or Daily game, the results screen gains a "Challenge a Friend" button that deep-links the specific board (using existing `challenge_id` pattern in `friend_challenges`) to a named friend. The recipient plays the exact same board/seed in their own session and sees the challenger's score overlaid as a ghost target.

The result screen already renders score, word count, and time. The `FriendChallenge` type has a `challengeId` field. The missing piece is: (a) storing the challenger's score alongside the challenge record, and (b) a ghost overlay UI during play showing "Beat [Name]'s 1,240 pts" as a persistent banner.

**Why it works**: Asynchronous challenges are the highest-return social loop in mobile/casual word games (Wordle sharing proved this for daily puzzles; this extends it to all modes). They convert solo play into social obligation and drive re-engagement when the challenger gets notified of the result.

**Milestones**
- Daily board seed already fixed per day — zero additional work for Daily mode
- Classic/Blast/Word Hunt: record `blastSeed` or grid hash at game start alongside challenge row
- Notification via existing `friends:challengeReceived` socket event

**Ghost Target UI**

```
┌─────────────────────────────────────┐
│  Beat ohad's 1,240 pts              │
│  ████████████░░░░  940 / 1,240      │
└─────────────────────────────────────┘
```

Renders as a fixed banner above the grid using the existing `AdaptiveMotion` wrapper.

---

### 2. Friend Activity Feed

**Priority**: P0
**Effort**: M
**Engagement Impact**: 4/5

**Design**

A dedicated tab (or section within the Friends panel) shows a reverse-chronological feed of friend activity:

- "[Alex] scored 1,840 on today's Daily — #3 on leaderboard"
- "[Sam] beat their personal best in Blast"
- "[Yuki] is on a 7-day streak"
- "[Dana] just reached Level 20"

Each item is tappable and routes to a challenge invite or message thread.

**Data sources that already exist**:
- `friends:friendOnline` / `friends:friendOffline` events
- `head_to_head.last_game_at` timestamps
- Daily leaderboard has `player_id` — can query friend positions post-game
- Level data is on `profiles.current_level`

**Backend work**: A lightweight `friend_activity` table (userId, activityType, payload JSON, createdAt) populated by game-completion hooks. One row per event, TTL 7 days. Friends query their feed on load.

**Why it works**: Social proof and FOMO are the two most reliable re-engagement drivers for asynchronous word games. Seeing that a friend just beat the daily is more motivating than any push notification.

---

### 3. Friend Leagues — Weekly Competition

**Priority**: P1
**Effort**: M
**Engagement Impact**: 5/5

**Design**

Each week, a friend group auto-enrolls in a private league. All Daily Challenge scores from Monday–Sunday accumulate. A mini-leaderboard shows ranks among friends specifically (not global), resetting Sunday midnight UTC.

**League tiers** (based on prior week performance):
- Bronze / Silver / Gold / Diamond

**Rewards**:
- Top finisher in friend group gets a cosmetic border or badge for their avatar for the following week (visible in FriendDetailDialog and room leaderboard)
- Participation reward (coins) for playing at least 4/7 days

**Why this works over the existing all-time leaderboard**: The global all-time leaderboard discourages casual players who see they can never reach rank 1. A friend league where you compete only against your 5–20 friends creates a winnable competitive context — the single strongest driver of sustained daily engagement in casual multiplayer games (Clash of Clans, FIFA Ultimate Team, Duolingo leagues all validated this).

**Schema addition**: `friend_league_scores` (week_start, user_id, total_score, rank_in_group). Group = friend graph snapshot taken Monday.

---

### 4. Friend Relationship Milestones

**Priority**: P1
**Effort**: S
**Engagement Impact**: 3/5

**Design**

The `HeadToHeadRecord` already tracks W/L/D and total games. Add narrative milestones rendered in FriendDetailDialog:

| Milestone | Trigger | Badge |
|---|---|---|
| First Blood | First win against this friend | Sword icon |
| Rival | 10+ games played, win rate 40–60% | Flames icon |
| Dominator | Win rate > 70% over 10+ games | Crown icon |
| Marathon | 50 games played together | Medal icon |
| Comeback Kid | Won after losing 3 in a row | Arrow-up icon |

The FriendDetailDialog currently shows only level and total games. This uses purely existing data — no backend changes. Pure frontend.

**FriendDetailDialog enhancement**:
- Replace the sparse 2-stat grid with a 3-column layout: H2H record (wins-draws-losses), shared milestone badge, and a "Last played Xd ago" timestamp from `last_game_at`
- Add a "History" button that opens a simple game-by-game list (already in `head_to_head` table rows if extended to store per-game history)

---

### 5. Social Bonuses — Play-With-Friends XP

**Priority**: P1
**Effort**: S
**Engagement Impact**: 3/5

**Design**

When two friends play a multiplayer game together (they are in the same room and are on each other's friend list):
- Both earn +20% XP for that game
- A "Friends Bonus" badge shows in the XP breakdown card (`XpBreakdownCard.tsx`)
- After 5 games together in a week: "Squad Bonus" — extra coin reward

Detection: Cross-reference room participant IDs with the `friends` table at game end (backend `wordHandler` / `gameLifecycleHandler` already has player list). The existing XP system and `XpBreakdownCard` component just needs an extra `socialBonus` field.

**Why**: Intrinsic motivation (playing with friends) should also carry extrinsic reward signal. This nudges players to prefer inviting friends over playing with strangers, which increases friend graph density and thus retention.

---

### 6. Live Spectating

**Priority**: P1
**Effort**: L
**Engagement Impact**: 4/5

**Design**

Friends can watch an in-progress multiplayer game in real-time as spectators. Spectators:
- See the live grid and word feed (already broadcast to room)
- See the live leaderboard (`CompactLeaderboard` component already exists in-game)
- Cannot interact or chat during the game (to prevent hints)
- See a "Spectating [Room Name]" banner
- Can send one emoji reaction every 10 seconds (rendered as a floating emoji burst over the grid)

The backend already has a spectator concept (the `upgradeToPlayer` guard mentioned in audits implies spectator state exists). The primary work is:
- A "Watch Live" button on a friend's profile when they are in an active game (presence event could carry `inGame: true | roomCode`)
- Spectator socket room membership that receives all game events but is excluded from scoring
- The emoji reaction system (S effort on its own)

**Presence change needed**: Extend `friends:friendOnline` payload to include `{ inGame: boolean, roomCode?: string }` — the presence handler already fires on socket connect.

---

### 7. Daily Friend Challenge Ritual

**Priority**: P2
**Effort**: S
**Engagement Impact**: 4/5

**Design**

Every day at reset (midnight UTC), if a player has friends who have already completed the Daily Challenge, they see a personalized prompt on the Daily landing page:

> "3 friends have already played today — Alex is leading with 1,840 pts. Can you beat them?"

This replaces the generic "Be first to play" empty state. It requires no new data — the `TabbedDailyLeaderboard` already fetches all participants and can cross-reference the friend list client-side.

Additionally, a "Challenge" shortcut on the Daily results page pre-fills a message to friends who haven't played yet: "I scored [X] — your turn!" using the existing `sendDirectChallenge` function.

Implementation: Pure frontend. Filter `todayParticipants` against the local friends list. Render friend-specific copy on the Daily landing. Cost: ~1 day of work.

---

### 8. Cooperative Mode — Word Rush (2v2 Team)

**Priority**: P2
**Effort**: L
**Engagement Impact**: 5/5

**Design**

Two pairs of friends compete as teams. Each team shares a grid. Team members can each find words — words found by either player count for the team's combined score. Communication is through a shared team chat during the game.

**Core mechanics**:
- Teams of 2 share a Classic grid
- Both players submit words independently; duplicate submissions within the team are allowed (the second submission is just ignored server-side, not penalized)
- Team combo: if both players find words within 5 seconds of each other, a "Sync Bonus" applies (+15% on the second word)
- A split-panel leaderboard shows both teams' total scores live

**Why cooperative matters**: The existing social graph is entirely competitive. Cooperative play serves a fundamentally different motivation (relatedness/affiliation from SDT) and creates a distinct player type who would otherwise churn from pure competition. Cooperative modes also generate stronger word-of-mouth ("play with me on my team") than competitive ones.

**Technical path**: The room system already supports multiple players on a shared grid. The primary new work is: (a) team assignment logic at room creation, (b) combined score aggregation on the backend, (c) team chat channel (separate from global room chat), (d) the Sync Bonus detection (time-windowed dual submission on same team).

---

### 9. Friend Streaks

**Priority**: P2
**Effort**: S
**Engagement Impact**: 3/5

**Design**

A "Connection Streak" tracks consecutive days where two friends both played a game (any mode) and at least one of them challenged or messaged the other. The streak counter appears in FriendDetailDialog and on the friend list row.

- Streak maintained: both played today and exchanged a challenge or message
- Streak broken: displayed as "Lost X-day streak" with a one-time streak-saver consumable (earned through play)
- Milestone at 7 days: "Week Warriors" badge
- Milestone at 30 days: "Inseparable" title

This borrows deliberately from Duolingo's streak mechanic applied to friend relationships, creating mutual accountability.

**Backend**: `friend_streaks` table with `(user_id, friend_id, current_streak, last_maintained_at, longest_streak)`. Updated by the same game-completion hooks as the activity feed.

---

### 10. Seasonal Friend Ranking + Trophies

**Priority**: P3
**Effort**: M
**Engagement Impact**: 4/5

**Design**

Monthly seasons with:
- A persistent "Season Trophy" cosmetic awarded to the #1 player in each friend group's league (from feature #3)
- A global Friends Leaderboard ranking showing "your best friend rank: X" — i.e., your highest-ranked friend this season
- Seasonal cosmetic unlocks (avatar borders, chat emojis) at season milestones

Seasons add long-term progression motivation beyond weekly leagues. The trophy cosmetic creates a visible social status signal that persists.

---

## Prioritized Roadmap

### Sprint 1 — High ROI, Low Effort (2–3 weeks)

| # | Feature | Effort | Impact |
|---|---|---|---|
| 7 | Daily Friend Challenge Ritual | S | 4/5 |
| 4 | Friend Relationship Milestones | S | 3/5 |
| 5 | Social Bonuses (XP) | S | 3/5 |

These three share no new backend tables, build entirely on existing data, and directly improve daily retention signals.

### Sprint 2 — Core Social Loop (4–6 weeks)

| # | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Async Beat-My-Score Challenge | S | 5/5 |
| 2 | Friend Activity Feed | M | 4/5 |
| 3 | Friend Weekly Leagues | M | 5/5 |
| 9 | Friend Streaks | S | 3/5 |

Sprint 2 establishes the retention loop: activity feed creates FOMO, leagues create weekly return obligation, async challenges create asynchronous engagement across time zones.

### Sprint 3 — Differentiation (6–10 weeks)

| # | Feature | Effort | Impact |
|---|---|---|---|
| 6 | Live Spectating | L | 4/5 |
| 8 | Cooperative Mode (Word Rush) | L | 5/5 |
| 10 | Seasonal Rankings + Trophies | M | 4/5 |

Sprint 3 features are architectural additions that create new content and new player types.

---

## Design Principles Applied

**Autonomy**: Every feature is opt-in. Leagues auto-enroll but can be exited. Challenges can be declined.

**Competence**: Friend leagues are scoped to your social circle so the competitive context is winnable. Milestones acknowledge improvement. Ghost targets in async challenges calibrate difficulty to a known opponent.

**Relatedness**: Cooperative mode, friend streaks, and the activity feed all serve the relatedness dimension — the most underserved motivation in the current design.

**Loss Aversion (ethical use)**: Friend streaks use this deliberately, but include a streak-saver mechanic to avoid punitive frustration. Weekly league relegation is soft (cosmetic only, no loss of progress).

**Social Proof**: The Daily landing page showing friends' scores is the single-lowest-effort application of social proof in the entire roadmap.

---

## Implementation Notes for Engineers

### Existing Hooks for Social Events

- Game end: `gameLifecycleHandler` — add activity write here
- Friend online: `friends:friendOnline` — extend payload with `inGame`
- Challenge received: `friends:challengeReceived` — already fires; async challenge just needs score data attached to the challenge row
- XP awarded: extend `XpBreakdownCard` with `socialBonus?: number` prop

### Database Additions (Sprint 2)

```sql
-- Friend activity feed
CREATE TABLE friend_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  activity_type TEXT NOT NULL, -- 'daily_score', 'level_up', 'streak_milestone', 'pb'
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON friend_activity(user_id, created_at DESC);

-- Friend weekly leagues
CREATE TABLE friend_league_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  total_score INT DEFAULT 0,
  days_played INT DEFAULT 0,
  UNIQUE(week_start, user_id)
);

-- Friend streaks
CREATE TABLE friend_streaks (
  user_id UUID REFERENCES profiles(id),
  friend_id UUID REFERENCES profiles(id),
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_maintained_at DATE,
  PRIMARY KEY(user_id, friend_id)
);
```

### Async Challenge Schema Extension

Add to `friend_challenges`:
```sql
ALTER TABLE friend_challenges
  ADD COLUMN challenger_score INT,
  ADD COLUMN challenger_word_count INT,
  ADD COLUMN board_seed TEXT,
  ADD COLUMN game_mode TEXT,
  ADD COLUMN challenger_completed_at TIMESTAMPTZ;
```

---

## Success Metrics

| Metric | Baseline (estimate) | 90-day Target |
|---|---|---|
| D7 retention | — | +8pp from leagues + async challenges |
| Daily sessions per DAU | — | +0.4 from activity feed FOMO |
| Friends added per new user | — | +0.3 from relationship milestones surface |
| Multiplayer room fill rate | — | +15% from spectate-to-play conversion |
| Daily Challenge completion rate | — | +12% from friend score prompts |

---

## Summary

The most impactful near-term investment is the **asynchronous beat-my-score challenge** (P0, S effort, 5/5 impact) because it converts every solo game into a potential social moment without requiring synchronous availability. Combined with the **Daily Friend Challenge Ritual** (P0, S effort, effectively one day of frontend work), these two features alone address the core gap: friends are listed but play is solitary.

The **Friend Weekly League** (P1, M effort) is the highest long-term retention mechanism and should be the anchor feature of Sprint 2, as it creates a weekly obligation that no other feature in the current design provides.

**Cooperative play** (Word Rush) is architecturally the most distinct addition and should be treated as a differentiating bet for Sprint 3 — no other competitive word game in the market offers synchronous cooperative word-finding.
