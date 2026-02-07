# LexiClash Routes & Pages

## Overview
Next.js App Router with `[locale]/` dynamic segment for i18n (Hebrew, English, Swedish, Japanese).

---

## Main Routes

### Home (`/[locale]/page.tsx`)
Landing page with game mode selection.
- **Components:** `LandingView`, `ModeCardV2`, `Mascot`
- **Purpose:** Game mode selection (Singleplayer, Multiplayer, Brain Training, Daily)

### Single Player (`/[locale]/singleplayer/page.tsx`)
Single player game mode.
- **Components:** `SinglePlayerGame`, `GridComponent`, `Timer`, `ScoreDisplay`

### Multiplayer (`/[locale]/multiplayer/page.tsx`)
Multiplayer lobby and game.
- **Components:** `MultiplayerLobby`, `PlayerCard`, `WaitingRoom`

### Daily Challenge (`/[locale]/daily/page.tsx`)
Daily challenge mode hub.
- **Sub-routes:**
  - `/daily/buzz` - Daily Buzz trending topics
  - `/daily/word-hunt` - Word hunt challenge

### Brain Training (`/[locale]/brain/page.tsx`)
Cognitive training hub.
- **Sub-routes (Drills):**
  - `/brain/drills/memory-hunt`
  - `/brain/drills/pattern-switcher`
  - `/brain/drills/rare-gems`
  - `/brain/drills/combo-master`
  - `/brain/drills/lightning-round`

### Adventure Mode (`/[locale]/adventure/page.tsx`)
Story-driven progression mode.
- **Sub-routes:**
  - `/adventure/skills` - Skill tree
  - `/adventure/achievements` - Achievement gallery

---

## User Routes

### Profile (`/[locale]/profile/page.tsx`)
User profile with stats and settings.

### Leaderboard (`/[locale]/leaderboard/page.tsx`)
Global and friends leaderboards.

### Friends (`/[locale]/friends/page.tsx`)
Friend list and social features.

### Settings (`/[locale]/settings/page.tsx`)
App settings and preferences.

---

## Join/Challenge Routes

### Join Game (`/[locale]/join/[code]/page.tsx`)
Join multiplayer room by code.
- **Dynamic:** `[code]` - Room code

### Challenge (`/[locale]/challenge/[code]/page.tsx`)
Challenge a friend.
- **Dynamic:** `[code]` - Challenge code

### Custom Puzzle (`/[locale]/custom/[puzzleCode]/page.tsx`)
Play custom puzzle.
- **Dynamic:** `[puzzleCode]` - Puzzle identifier

---

## Education Routes

### Education Hub (`/[locale]/education/page.tsx`)
Educational features overview.

### Classroom Game (`/[locale]/education/classroom-game/page.tsx`)
Classroom gameplay mode.

### Teacher Portal (`/[locale]/teacher/page.tsx`)
Teacher dashboard.
- **Sub-routes:**
  - `/teacher/classroom/[id]/analytics` - Class analytics
  - `/teacher/reports` - Reports dashboard
  - `/teacher/curriculum` - Curriculum management

### Student Portal (`/[locale]/student/page.tsx`)
Student dashboard.
- **Sub-routes:**
  - `/student/join` - Join classroom
  - `/student/profile` - Student profile
  - `/student/lessons` - Lessons list
  - `/student/lessons/[id]` - Specific lesson

---

## Content Routes

### Blog (`/[locale]/blog/page.tsx`)
Blog listing page.
- **Articles:**
  - `/blog/improve-word-game-skills`
  - `/blog/science-behind-word-games`
  - `/blog/10-surprising-benefits-word-games`
  - `/blog/daily-challenge-strategies`
  - `/blog/multilingual-word-learning`
  - `/blog/top-player-secrets`

### About (`/[locale]/about/page.tsx`)
About the game.

### Rules (`/[locale]/rules/page.tsx`)
Game rules explanation.

### FAQ (`/[locale]/faq/page.tsx`)
Frequently asked questions.

### Contact (`/[locale]/contact/page.tsx`)
Contact form.

---

## Legal Routes

### Legal Hub (`/[locale]/legal/page.tsx`)
Legal documents hub.

### Privacy Policy (`/[locale]/legal/privacy/page.tsx`)
Privacy policy.

### Terms of Service (`/[locale]/legal/terms/page.tsx`)
Terms of service.

### Accessibility (`/[locale]/accessibility/page.tsx`)
Accessibility statement.

---

## Admin Routes

### Admin Dashboard (`/[locale]/admin/page.tsx`)
Admin overview.
- **Sub-routes:**
  - `/admin/words` - Word management
  - `/admin/players` - Player management
  - `/admin/dictionary` - Dictionary management
  - `/admin/invalid-words` - Invalid word reports
  - `/admin/wikipedia-words` - Wikipedia word imports
  - `/admin/daily-buzz` - Daily buzz management
  - `/admin/web-vitals` - Performance metrics
  - `/admin/word-bank` - Word bank management
  - `/admin/milog-words` - Hebrew dictionary enrichment

---

## Special Routes

### Auth Callback (`/[locale]/auth/callback/page.tsx`)
OAuth authentication callback.

### Unsubscribe (`/[locale]/unsubscribe/page.tsx`)
Email unsubscribe.

### Hebrew SEO (`/[locale]/hebrew-multiplayer-word-game/page.tsx`)
Hebrew-specific landing for SEO.

### Party Screen (`/party-screen/page.tsx`)
TV/screen display for party mode.
- `/party-screen/[roomCode]` - Specific room display

---

## Route Components Mapping

| Route | Primary Components |
|-------|-------------------|
| Home | LandingView, ModeCardV2, Mascot |
| Singleplayer | SinglePlayerGame, GridComponent, Timer |
| Multiplayer | MultiplayerLobby, PlayerCard, GameRoom |
| Daily | DailyChallengeHub, DailyBuzzGame |
| Brain | BrainTrainingHub, DrillCard |
| Adventure | AdventureMap, WorldNode, BossBattle |
| Results | ResultsPage, ScoreReveal, WordList |
| Profile | ProfileStats, AchievementGrid |
| Leaderboard | LeaderboardTable, RankBadge |

---

## Layout Structure

```
app/
├── layout.tsx              # Root layout (fonts, providers)
├── [locale]/
│   ├── layout.tsx          # Locale layout (i18n provider)
│   ├── page.tsx            # Home/Landing
│   ├── singleplayer/
│   ├── multiplayer/
│   ├── daily/
│   ├── brain/
│   ├── adventure/
│   ├── profile/
│   ├── settings/
│   └── ...
└── party-screen/           # No locale (display only)
```
