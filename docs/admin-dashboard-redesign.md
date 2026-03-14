# LexiClash Admin Dashboard — UI/UX Redesign

**Document type**: Design specification
**Scope**: Information architecture, wireframes, component patterns, interaction design
**Design system**: Neo-brutalist (border-3, shadow-hard, rounded-neo, dark navy)
**Date**: 2026-03-14

---

## 1. Problem Diagnosis

### Root cause of cognitive overload

The current layout treats every function with equal visual weight. Nine navigation cards at the top, then four inline panels below — the user's eye has no anchor point. There is no separation between operational tasks (moderate words, respond to flags) and analytical tasks (understand retention, track DAU). These two mental modes require completely different information densities and interaction patterns.

### Compounding issues

| Issue | Impact |
|---|---|
| Mixed white/teal and neo-brutalist visual languages | Breaks trust in system coherence |
| Presence dots without legend | Green dot = online? In game? Staff? Unknown |
| Tables without filters visible in-context | User cannot tell what subset they are viewing |
| No moderation queue | Reports and flags buried in generic player search |
| No drill-down from game cards | Clicking a live game card goes nowhere |
| No export | Admins copy-paste from tables manually |
| Mobile tables overflow horizontally | Data inaccessible on any device under 1024px |

---

## 2. Information Architecture

### Mental model: three admin roles

Real admin usage clusters into three distinct modes. The redesign should match these, not the technical categories of the current nine cards.

```
OPERATOR mode    — "What is happening right now?"
  Live game monitor, active player count, server health, moderation queue alerts

ANALYST mode     — "How is the game performing over time?"
  DAU/MAU, retention cohorts, game mode adoption, word economy, geography

CURATOR mode     — "Is the word data and content correct?"
  Dictionary review, invalid word queue, daily challenge scheduling, Wikipedia word bank
```

### Navigation hierarchy (three levels)

```
Level 1 — Primary sections (sidebar)
  Overview        [home]
  Analytics       [chart]
  Moderation      [shield]
  Players         [users]
  Content         [book]
  System          [server]

Level 2 — Sub-pages (tabs within section)
  Analytics:   Engagement | Retention | Economy | Geography
  Moderation:  Word Reports | Cheat Flags | Email Queue | Player Appeals
  Players:     Search | Leaderboard | Bulk Actions
  Content:     Dictionary | Daily Challenge | Word Bank | Templates
  System:      Health | Logs | Email | Config

Level 3 — Detail views (slide-in panel or full page)
  Player detail, Game replay, Word audit, Report review
```

### What moves where

| Current item | New location | Rationale |
|---|---|---|
| LiveMonitor | Overview (above fold) | Operational, always-visible |
| TodayGamesHistory | Overview (below fold) | Contextual to live view |
| GamesDiagnostic | System > Health | Technical, not primary |
| Players card | Players > Search | Dedicated section |
| Dictionary card | Content > Dictionary | With related tools |
| Invalid Words | Moderation > Word Reports | This IS moderation |
| Milog Words | Content > Word Bank | Curation task |
| Daily Challenge | Content > Daily Challenge | Scheduling task |
| Wikipedia Words | Content > Word Bank | Same curation bucket |
| Word Bank | Content > Word Bank | Collapsed with above |
| Web Vitals | System > Health | Technical |
| Email Testing | System > Email | Testing tool |
| EmailTestPanel | System > Email | Deduplicated |

---

## 3. Layout System

### Desktop layout (1280px+)

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR (240px fixed)         │ MAIN CONTENT (flex-1)            │
│                               │                                  │
│ ┌───────────────────────────┐ │ ┌──────────────────────────────┐ │
│ │  LexiClash Admin          │ │ │  Page header + breadcrumb    │ │
│ │  [logo]  v2.4.1           │ │ │  + primary action button     │ │
│ └───────────────────────────┘ │ └──────────────────────────────┘ │
│                               │                                  │
│  ● Overview                   │  [Page content area]             │
│  ○ Analytics                  │                                  │
│  ○ Moderation    [3]          │                                  │
│  ○ Players                    │                                  │
│  ○ Content                    │                                  │
│  ○ System                     │                                  │
│                               │                                  │
│ ─────────────────────────── │ │                                  │
│                               │                                  │
│  Server: ● HEALTHY            │                                  │
│  Redis:  ● HEALTHY            │                                  │
│  Players online: 847          │                                  │
│                               │                                  │
│  [Your name]  [Sign out]      │                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Tablet layout (768–1279px)

Sidebar collapses to icon-only (56px). Hovering or tapping the menu icon expands it as an overlay. Main content takes full remaining width.

### Mobile layout (< 768px)

Sidebar becomes a bottom tab bar with 5 icons (Overview, Analytics, Moderation, Content, System). Page header stacks vertically. Tables switch to card-list view (each row becomes a stacked card).

---

## 4. Wireframes

### 4.1 Overview / Home Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│ Overview                                          [Refresh ↺]    │
│ Last updated: 14 Mar 2026, 09:42                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  KPI ROW — 4 cards, equal width                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐  │
│  │ DAU          │ │ Games today  │ │ Active now   │ │ Flags  │  │
│  │              │ │              │ │              │ │        │  │
│  │  2,841       │ │  1,204       │ │  ███ 847     │ │ ⚠ 12   │  │
│  │  ↑ 8% vs     │ │  ↑ 3%        │ │  live        │ │  open  │  │
│  │  yesterday   │ │  vs avg      │ │              │ │        │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘  │
│                                                                  │
│  Border: border-3 border-black                                   │
│  KPI number: text-4xl font-bold font-neo-display                 │
│  Trend delta: neo-lime (positive) / neo-red (negative)           │
│  Flags card: neo-pink border when count > 0                      │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LEFT COLUMN (60%)              RIGHT COLUMN (40%)               │
│  ┌────────────────────────────┐  ┌─────────────────────────────┐ │
│  │ LIVE GAMES                 │  │ MODERATION QUEUE            │ │
│  │ ─────────────────────────  │  │ ──────────────────────────  │ │
│  │ Filter: [All ▼] [Mode ▼]  │  │ ┌────────────────────────┐  │ │
│  │                            │  │ │ INVALID WORD           │  │ │
│  │ ┌──────────────────────┐   │  │ │ "zymurgy"  ×14 reports │  │ │
│  │ │ [CLASSIC] Room #4821  │   │  │ │ [Approve] [Reject]     │  │ │
│  │ │ 4 players  02:14 left │   │  │ └────────────────────────┘  │ │
│  │ │ ● ● ● ●              │   │  │ ┌────────────────────────┐  │ │
│  │ │ [View ›]             │   │  │ │ CHEAT FLAG             │  │ │
│  │ └──────────────────────┘   │  │ │ Player #9847  score ×8 │  │ │
│  │                            │  │ │ outlier. [Review ›]    │  │ │
│  │ ┌──────────────────────┐   │  │ └────────────────────────┘  │ │
│  │ │ [BLAST] Room #4819    │   │  │ ┌────────────────────────┐  │ │
│  │ │ 2 players  00:48 left │   │  │ │ INVALID WORD           │  │ │
│  │ │ ● ●                  │   │  │ │ "quixotism"  ×8        │  │ │
│  │ │ [View ›]             │   │  │ │ [Approve] [Reject]     │  │ │
│  │ └──────────────────────┘   │  │ └────────────────────────┘  │ │
│  │                            │  │                             │ │
│  │ [Load more]                │  │ [See all 12 open items ›]   │ │
│  └────────────────────────────┘  └─────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TODAY'S GAME HISTORY                [Export CSV ↓]             │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Active filters: Mode: Classic  |  [✕ Clear]                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Room    Mode      Players  Duration  Winner      Score     │  │
│  │ ──────  ────────  ───────  ────────  ──────────  ────────  │  │
│  │ #4820   Classic   4        4m 12s    PlayerAce   2,840     │  │
│  │ #4819   Blast     2        3m 48s    WordSlinger 4,100     │  │
│  │ #4817   WordHunt  6        5m 00s    Lexicon99   1,720     │  │
│  │         ...                                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Each row: hover shows [View Replay ›] inline action             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Analytics Page

```
┌──────────────────────────────────────────────────────────────────┐
│ Analytics                                                        │
│                                                                  │
│  Tabs: [Engagement] [Retention] [Economy] [Geography]            │
│        ^^^^^^^^^^^                                               │
│        Active tab: bottom border-3 neo-lime, bold               │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Date range: [Last 7d ▼]   Compare to: [Previous period ▼]      │
│  [Apply]                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ENGAGEMENT TAB                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ DAU / WAU / MAU                        [Line chart]     │    │
│  │                                                         │    │
│  │  3k ┤                          ╭──╮                     │    │
│  │  2k ┤              ╭──╮   ╭────╯  ╰──                   │    │
│  │  1k ┤    ╭──╮  ────╯  ╰───╯                             │    │
│  │   0 └────┴──┴────────────────────────────── time        │    │
│  │         ── DAU   ·· WAU   -- MAU                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │ GAME MODE SPLIT  │  │ SESSION LENGTH DISTRIBUTION          │  │
│  │ [Donut chart]    │  │ [Histogram]                          │  │
│  │                  │  │                                      │  │
│  │  Classic  42%    │  │  < 1m   ██                           │  │
│  │  Blast    28%    │  │  1–3m   ████████                     │  │
│  │  WordHunt 18%    │  │  3–5m   ████████████                 │  │
│  │  Adventure 12%  │  │  5–10m  ██████                       │  │
│  └──────────────────┘  └──────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ACQUISITION FUNNEL                                      │    │
│  │                                                         │    │
│  │  Visit         ████████████████████████████  18,400     │    │
│  │  Start game    █████████████████████  12,200  (66%)     │    │
│  │  Complete game ████████████████  9,400  (77%)           │    │
│  │  Register      ██████  3,200  (34%)                     │    │
│  │  Return D2     ████  2,100  (66%)                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Retention Tab:**
```
┌─────────────────────────────────────────────────────────────────┐
│  RETENTION TAB                                                  │
│                                                                  │
│  Cohort table — each row is a registration week                  │
│  Columns: Week 0 | D1 | D7 | D14 | D30 | D60 | D90             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Cohort      W0     D1     D7     D14    D30    D60      │    │
│  │ 2026 W10    100%   62%    38%    28%    18%    --       │    │
│  │ 2026 W9     100%   60%    35%    24%    16%    9%       │    │
│  │ 2026 W8     100%   58%    33%    22%    14%    8%       │    │
│  │ ...                                                     │    │
│  │                                                         │    │
│  │  Color scale: 0%=navy  30%=neo-purple  60%+=neo-lime    │    │
│  │  (heatmap cells, no borders between cells)              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  CHURN PREDICTION FLAGS                                         │
│  Players with declining engagement flagged for re-engagement    │
│  [View 84 at-risk players ›]                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Moderation Queue

```
┌──────────────────────────────────────────────────────────────────┐
│ Moderation                                      [Bulk actions ▼]│
│                                                                  │
│  Tabs: [Word Reports (8)] [Cheat Flags (4)] [Appeals (0)]        │
│        ^^^^^^^^^^^^^^^^^^^                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WORD REPORTS TAB                                                │
│                                                                  │
│  Filters (always visible, NOT hidden in collapse):               │
│  Language: [All ▼]  Min reports: [3 ▼]  Search: [________]      │
│  Active filters shown as pills: [Language: EN ✕] [Min: 5 ✕]     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [ ] Word         Lang  Reports  First seen    Reason      │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ [ ] ZYMURGY      EN    ×14      2026-03-01    Not a word  │   │
│  │     ├─ Submitted by 14 unique players                    │   │
│  │     └─ [Approve: add to dictionary] [Reject] [Details ›] │   │
│  │                                                          │   │
│  │ [ ] QUIXOTISM    EN    ×8       2026-03-04    Not a word  │   │
│  │     ├─ Submitted by 8 unique players                     │   │
│  │     └─ [Approve] [Reject] [Details ›]                    │   │
│  │                                                          │   │
│  │ [ ] DEFENESTRAR  ES    ×6       2026-03-07    Not a word  │   │
│  │     ├─ Submitted by 5 unique players                     │   │
│  │     └─ [Approve] [Reject] [Details ›]                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Bulk: [Select all]  With selected: [Approve ▼] [Reject ▼]      │
│                                                                  │
│  Note: each row is expandable (accordion) — clicking anywhere   │
│  on the row except action buttons toggles the sub-row detail.   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Cheat Flags Tab:**
```
┌──────────────────────────────────────────────────────────────────┐
│  CHEAT FLAGS TAB                                                 │
│                                                                  │
│  Severity: [All ▼]  Game mode: [All ▼]  Date: [Last 7d ▼]       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Player        Game    Triggered by           Severity     │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ PlayerAce     #4812   Score outlier ×8 avg   ● HIGH      │   │
│  │   └─ Score: 12,400  |  Room avg: 1,550  |  [Review ›]   │   │
│  │                                                          │   │
│  │ WordSlinger   #4801   Sub-50ms avg word time  ● MEDIUM   │   │
│  │   └─ Avg submit: 48ms  |  Human baseline: 800ms          │   │
│  │      [Review ›]  [Dismiss]                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ● HIGH = neo-pink border   ● MEDIUM = neo-yellow   ● LOW = gray │
│  (Legend always visible above table, never dots-only)           │
└──────────────────────────────────────────────────────────────────┘
```

---

### 4.4 Player Detail Page

Accessed from: Players > Search row click, or Overview > Live game player click, or Moderation flag [Review] link.

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Players                                                        │
│ Player: WordSlinger   ID: #9847                                  │
│                                                                  │
│  Tabs: [Profile] [Game History] [Flags] [Economy] [Actions]     │
│        ^^^^^^^^^                                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PROFILE TAB                                                     │
│                                                                  │
│  LEFT (avatar + identity)      RIGHT (lifetime stats)            │
│  ┌─────────────────────────┐   ┌──────────────────────────────┐  │
│  │  [Avatar]               │   │ Total games    1,204          │  │
│  │  WordSlinger            │   │ Win rate       38%            │  │
│  │  Joined: 2025-11-14     │   │ Best score     12,400         │  │
│  │  Country: US            │   │ Avg score      3,840          │  │
│  │  Email: w***@gmail.com  │   │ Words found    48,200         │  │
│  │  [Reveal ›]             │   │ Coins          2,840          │  │
│  │                         │   │ XP / Level     14,200 / Lv24  │  │
│  │  Last seen: 2m ago      │   │ Streak (curr)  7 days         │  │
│  │  Status: ● In game      │   └──────────────────────────────┘  │
│  └─────────────────────────┘                                     │
│                                                                  │
│  ACTIVITY TIMELINE                                               │
│  ───────────────────────────────────────────────────────────    │
│  14 Mar  09:34  Joined game #4821 (Classic, 4p)                  │
│  14 Mar  09:22  Completed game #4819  Score: 4,100  ★ Win        │
│  14 Mar  09:10  Joined game #4819 (Blast, 2p)                    │
│  13 Mar  22:48  Completed game #4801  Score: 2,200               │
│  [Load more]                                                     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  QUICK ACTIONS  (visible on all tabs as sticky footer)           │
│  [Suspend 24h] [Ban] [Reset password] [Send email] [Add note]   │
│                                                                  │
│  Destructive actions (Ban, Suspend): require confirmation modal  │
│  with reason field before executing.                             │
└──────────────────────────────────────────────────────────────────┘
```

---

### 4.5 Game Replay / Audit Page

Accessed from: Overview game history row [View Replay], or Player detail > Game History.

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Game History              Game #4819  |  Blast  |  2p         │
│                              14 Mar 2026, 09:10–09:22           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GAME SUMMARY                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Duration │  │ Winner   │  │ Total    │  │ Board seed    │   │
│  │ 3m 48s   │  │ WordSlgr │  │ words: 84│  │ #8f2d1a       │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│                                                                  │
│  BOARD SNAPSHOT           SCORE TIMELINE                         │
│  ┌──────────────────┐     ┌─────────────────────────────────┐   │
│  │  W  O  R  D  S   │     │  Score                          │   │
│  │  L  E  X  I  C   │     │  4k ┤                    ╭──    │   │
│  │  O  N  P  A  R   │     │  3k ┤           ╭────────╯      │   │
│  │  K  A  B  O  G   │     │  2k ┤    ╭──────╯              │   │
│  │  G  L  E  N  T   │     │  1k ┤ ───╯                     │   │
│  └──────────────────┘     │   0 └──────────────── time      │   │
│  Board shown as static    │      ── WordSlgr  ·· Opponent    │   │
│  grid for reference       └─────────────────────────────────┘   │
│                                                                  │
│  WORD LOG                                      [Export CSV ↓]    │
│  ─────────────────────────────────────────────────────────────  │
│  Filter: Player: [All ▼]  Valid: [All ▼]  Search: [________]    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Time    Player       Word         Score  Valid  Path        │  │
│  │ ──────  ───────────  ───────────  ─────  ─────  ─────────  │  │
│  │ 00:04   WordSlgr     LEXICON      +240   ✓                 │  │
│  │ 00:07   Opponent     WORDS        +80    ✓                 │  │
│  │ 00:09   WordSlgr     BOGGLING     +320   ✓                 │  │
│  │ 00:12   Opponent     ZYMURGY      --     ✗ Invalid         │  │
│  │ ...                                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Invalid words highlighted with neo-red row background           │
│  Cheat-flagged words get neo-pink border on row                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Patterns

### 5.1 KPI Card

Visual anatomy:
- Outer: `bg-neo-navy-light border-3 border-black shadow-hard rounded-neo p-4`
- Label: `text-sm font-neo-body text-gray-400 uppercase tracking-wide`
- Value: `text-4xl font-bold font-neo-display text-white`
- Delta: positive uses `text-neo-lime`, negative uses `text-neo-red`, preceded by `↑`/`↓`
- Alert state (flags card): replace `border-black` with `border-neo-pink` and add pulse animation

Interaction: clicking a KPI card navigates to the relevant drill-down (DAU card → Analytics > Engagement, Flags card → Moderation > Word Reports).

```
State: default
┌─────────────────────────┐
│ DAILY ACTIVE USERS      │  ← label, text-sm gray uppercase
│                         │
│  2,841                  │  ← value, text-4xl bold neo-display
│  ↑ 8% vs yesterday      │  ← delta, text-sm neo-lime
└─────────────────────────┘
border-3 border-black shadow-hard rounded-neo

State: alert (new moderation items)
┌─────────────────────────┐  ← border-neo-pink, pulse shadow
│ OPEN FLAGS              │
│                         │
│  ⚠ 12                   │  ← icon + count, text-neo-pink
│  8 new since last visit  │  ← text-sm text-gray-400
└─────────────────────────┘
```

### 5.2 Data Table

Full pattern for admin tables:

- Container: `overflow-x-auto` wrapper (horizontal scroll on mobile, visible scrollbar)
- Table: `w-full min-w-[640px]` (prevents collapse below readable width)
- Header row: `bg-neo-gray text-neo-lime text-xs uppercase tracking-widest`
- Body rows: `border-b border-neo-gray hover:bg-neo-gray/40 transition-colors`
- Expandable rows: chevron icon rotates 90deg on open; sub-row slides in with 150ms ease
- Sorted column: header gets `border-b-2 border-neo-lime`
- Row checkbox: Radix Checkbox, `accent-neo-lime`

Active filter pill pattern (ALWAYS show active filters inline above table, never hidden):
```
Active filters: [Mode: Classic ✕] [Date: Last 7d ✕]  |  Showing 1,204 of 18,400 results
```
The count "X of Y" is critical — admin must always know the scope of what they see.

### 5.3 Status Badges + Presence Legend

Replace bare presence dots with labelled badges:

```
● ONLINE    — neo-lime dot + text, border-neo-lime/30 pill
● IN GAME   — neo-cyan dot + text
● IDLE      — gray dot + text (no activity > 5 min)
● OFFLINE   — no dot, text only, gray

Legend block (shown once at top of any page with presence indicators):
┌───────────────────────────────────────────────────────┐
│ ● Online  ● In game  ● Idle  ● Offline                │
└───────────────────────────────────────────────────────┘
```

For game mode badges:
```
[CLASSIC]    — bg-neo-cyan text-black border-black
[BLAST]      — bg-neo-pink text-white border-black
[WORD HUNT]  — bg-neo-purple text-white border-black
[ADVENTURE]  — bg-neo-lime text-black border-black
```
All badges: `border-2 border-black px-2 py-0.5 text-xs font-bold rounded-neo`

### 5.4 Confirmation Dialogs for Destructive Actions

Never use browser `confirm()`. Use a modal with:
- Title: action name (e.g., "Ban WordSlinger")
- Body: consequences paragraph ("This will prevent the player from signing in. All active sessions will be terminated immediately.")
- Reason field: required `<textarea>` for audit trail
- Buttons: `[Cancel]` (neutral, left) and `[Confirm Ban]` (neo-red fill, right)
- ESC closes dialog, returns focus to trigger button (WCAG 2.1 AA dialog pattern)

### 5.5 Export Button Pattern

Every table with more than 20 rows gets an `[Export CSV ↓]` button.

Placement: top-right of the table card, secondary styling.
Behavior: calls `/api/admin/[resource]/export?filters=...` with current filter state baked in. Returns CSV download. Button shows spinner while generating. On error: NeoToast with retry.

### 5.6 Inline Action Row Pattern (moderation items)

Moderation queue rows use a three-button inline action pattern to avoid the friction of navigating to a detail page for routine bulk decisions:

```
┌────────────────────────────────────────────────────────────────┐
│ ZYMURGY    EN   ×14 reports                                    │
│ ├─ 14 unique reporters  |  First: 2026-03-01                   │
│ └─ [Approve ✓]  [Reject ✗]  [Details ›]                       │
└────────────────────────────────────────────────────────────────┘
```

After Approve or Reject is clicked:
1. Button becomes spinner (150ms)
2. Row slides out with neo-lime (approve) or neo-red (reject) flash
3. Next item slides up
4. Toast: "Approved: ZYMURGY" with [Undo] for 5 seconds

### 5.7 Chart Component Styling

Charts are rendered with a charting library (Recharts recommended — already minimal, works with SSR). Neo-brutalist chart style:

- Background: `bg-neo-navy-light`
- Grid lines: `stroke-neo-gray opacity-50` (horizontal only, no vertical grid)
- Axis labels: Rubik font, `fill-gray-400 text-xs`
- Line colors: follow the design system color assignments (DAU=neo-lime, WAU=neo-cyan, MAU=neo-purple)
- NO drop shadows on lines (hard shadows only on containers)
- Tooltip: `bg-neo-gray border-2 border-black shadow-hard-sm rounded-neo p-2`
- Legend: rendered as custom pill list below chart, not default Recharts legend

---

## 6. Navigation Sidebar — Detailed Spec

```
┌─────────────────────────────────┐
│  LEXICLASH ADMIN                │  ← font-neo-display text-neo-lime
│  v2.4.1                         │  ← text-xs text-gray-500
│                                 │
├─────────────────────────────────┤
│                                 │
│  ◆ Overview                     │  ← active: bg-neo-lime text-black
│    Analytics                    │  ← inactive: text-gray-300 hover:text-white
│    Moderation           [3]     │  ← badge: bg-neo-pink text-white rounded-full
│    Players                      │
│    Content                      │
│    System                       │
│                                 │
├─────────────────────────────────┤  ← border-t border-neo-gray
│                                 │
│  SERVER HEALTH                  │  ← text-xs uppercase text-gray-500
│  ● API        HEALTHY           │
│  ● Redis      HEALTHY           │
│  ● Supabase   HEALTHY           │
│                                 │
│  Players online: 847            │
│                                 │
├─────────────────────────────────┤
│  Admin User    [Sign out]       │
└─────────────────────────────────┘
```

Active state: full-width highlight bar using `bg-neo-lime text-black font-bold`.
Icon size: 18px, consistent Lucide icons throughout.
Badge counter: only show when count > 0. Animate in with neo-pop. Auto-updates via polling every 30s.

Collapsed (tablet) state: show icon only, tooltip on hover shows label. Badge dot remains visible even collapsed.

---

## 7. Mobile-First Considerations

### Bottom tab bar (< 768px)

```
┌────────────────────────────────────────────┐
│                                            │
│   (page content)                           │
│                                            │
├────────────────────────────────────────────┤
│  [◆]     [📊]    [🛡 3]   [📖]    [⚙]     │
│  Home  Analytics  Mod  Content  System     │
└────────────────────────────────────────────┘
height: 56px + safe-area-inset-bottom
```

Badge on Moderation tab icon (same neo-pink dot pattern as sidebar).

### Mobile table strategy

Tables switch to card-list layout below 640px. Each table row becomes a stacked card:

```
┌────────────────────────────────┐
│ CLASSIC · Room #4820           │  ← mode badge + room ID
│ 4 players  |  4m 12s           │  ← secondary info, horizontal
│ Winner: PlayerAce  · 2,840 pts │  ← result line
│                    [View ›]    │  ← action aligned right
└────────────────────────────────┘
border-2 border-black shadow-hard-sm rounded-neo mb-2
```

This removes horizontal scroll completely on mobile. The card uses the same neo-brutalist border + shadow pattern as all other cards.

### Mobile-specific interaction adjustments

- All action buttons minimum touch target: 44×44px (WCAG 2.5.5)
- Filters hidden behind [Filters ▼] disclosure button on mobile; active filter count shown as badge on the button
- Confirmation modals: full-screen on mobile (not centered overlay)
- Export CSV disabled on mobile (replaced with "Send to email" option)

---

## 8. Accessibility Improvements

### Current violations (high priority)

1. Presence dots with no text alternative — fix: always pair with text label, or add `aria-label="Player is online"` to dot span
2. Tables without `<caption>` or `aria-label` — fix: every admin table gets a descriptive caption
3. Destructive actions using `confirm()` — fix: modal pattern (spec in section 5.4)
4. Filter state not announced to screen readers — fix: when filters change, announce result count via `aria-live="polite"` region
5. Color as sole error indicator in cheat flag severity — fix: pair color with icon AND text label

### Keyboard navigation requirements

- Sidebar: full arrow-key navigation between items
- Tables: Tab moves between rows; Enter opens detail; Space toggles checkbox
- Moderation inline actions: Approve/Reject reachable by keyboard; after action focus moves to next item automatically
- Dialogs: focus trapped inside while open; ESC dismisses; focus returns to trigger on close
- Charts: provide a data table alternative accessible via `aria-details` on each chart

### WCAG 2.1 AA color contrast checklist

| Element | Current | Required | Fix |
|---|---|---|---|
| Gray-400 text on navy-light | ~3.8:1 | 4.5:1 | Use gray-300 (#D1D5DB) |
| Neo-lime text on white bg | fails | 4.5:1 | Never use neo-lime on white (dark bg only) |
| Game mode badges | varies | 4.5:1 | Verify each combination |
| Table row hover state | low | 3:1 (UI) | Increase opacity of hover bg |

---

## 9. Design Tokens for Admin-Specific Components

These extend the existing design system without replacing it. Add to `globals.css` or a dedicated `admin.css`:

```css
/* Admin-specific semantic tokens */
--admin-sidebar-width: 240px;
--admin-sidebar-collapsed-width: 56px;
--admin-header-height: 56px;

/* Severity colors (reuse existing palette) */
--severity-high: var(--neo-pink);
--severity-medium: var(--neo-lime);
--severity-low: var(--neo-cyan-muted);
--severity-info: var(--neo-purple-light);

/* Status colors */
--status-healthy: var(--neo-lime);
--status-degraded: var(--neo-yellow);  /* deprecated yellow, acceptable for warning */
--status-down: var(--neo-red);

/* Chart palette (ordered) */
--chart-1: var(--neo-lime);
--chart-2: var(--neo-cyan);
--chart-3: var(--neo-purple);
--chart-4: var(--neo-pink);
--chart-5: var(--neo-lime-muted);
```

---

## 10. Implementation Roadmap

Ordered by user-facing impact per engineering effort:

### Phase 1 — Navigation skeleton + Overview (highest ROI)
- Implement sidebar with routing
- Implement KPI row (wire to existing `/api/admin` endpoints)
- Move LiveMonitor + TodayGamesHistory into Overview layout
- Add moderation queue widget to Overview right column
- Establish shared `AdminTable` component with filter-pill pattern

Estimated scope: 4–6 new components, 2 new layout files

### Phase 2 — Moderation queue page
- Word Reports tab (data already exists in `invalidWordRoutes.ts`)
- Active filter indicators (language, minCount pills)
- Inline Approve/Reject with undo toast
- Bulk actions (select all, bulk approve)
- Export CSV

### Phase 3 — Player detail page
- Search page with AdminTable
- Player detail tabs (Profile, Game History, Flags)
- Quick actions with confirmation modal
- Activity timeline

### Phase 4 — Analytics page
- Engagement tab: DAU/WAU/MAU line chart, game mode donut, funnel
- Retention tab: cohort heatmap table
- Economy tab: coin supply/demand, gold spending
- Recharts integration with neo-brutalist custom theme

### Phase 5 — Game replay + Content pages
- Game audit view with word log and board snapshot
- Dictionary management UI improvements (filtering, bulk edit)
- Daily Challenge scheduling interface

### Phase 6 — Mobile polish + accessibility audit
- Card-list responsive tables
- Bottom tab bar
- Full WCAG 2.1 AA audit pass
- Keyboard navigation verification

---

## 11. Files to Create

```
fe-next/app/[locale]/admin/
  layout.tsx                     — sidebar + main shell
  page.tsx                       — overview/home
  analytics/page.tsx
  moderation/page.tsx
  players/page.tsx
  players/[id]/page.tsx          — player detail
  games/[id]/page.tsx            — game replay/audit
  content/page.tsx
  system/page.tsx

fe-next/components/admin/
  AdminSidebar.tsx
  AdminKPICard.tsx
  AdminTable.tsx                 — shared table with filter pills
  AdminFilterBar.tsx
  AdminConfirmDialog.tsx
  AdminStatusBadge.tsx
  AdminGameModeBadge.tsx
  AdminPresenceLegend.tsx
  AdminExportButton.tsx
  AdminModerationQueueItem.tsx
  charts/
    LineChart.tsx
    DonutChart.tsx
    FunnelChart.tsx
    CohortHeatmap.tsx
```

Each file must stay under 300 lines (project constraint). `AdminTable` and chart components are the most likely to need splitting into sub-components + hooks.
