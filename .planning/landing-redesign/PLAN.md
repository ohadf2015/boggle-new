# Landing Page Redesign + Custom Avatar Builder — Implementation Plan

## Design Reference
- **Chosen Design**: LexiClash Competitive Redesign (refined with clear hero)
- **Preview URL**: https://p.superdesign.dev/draft/1228eb29-6e20-425e-a83e-357d2c670326
- **Canvas (all drafts)**: https://app.superdesign.dev/teams/18139703-da30-49d5-b72c-9d4913d0f4d5/projects/0cfe61fb-a78b-4985-9f02-38b9587ec306
- **Design System**: `.superdesign/design-system.md`

## Key Design Decisions
- **Social proof stats**: Only show when meaningful. Use thresholds:
  - "X Games Today" — show only if > 100
  - "X Active Players" — show only if > 10
  - "X Game Modes" — always show (static, always true)
  - "X Languages" — always show (static, always true)
  - If fewer than 2 dynamic stats pass threshold, hide the entire social proof bar
- **Avatar system**: Move from 17 pre-made food PNGs to SVG-based "build your own" avatar
- **Backward compat**: Old `avatar_image` IDs keep working via fallback chain

---

## Phase 1: Avatar Builder — Types & Data Layer

### 1.1 — Shared Types (`fe-next/shared/types/customAvatar.ts`)
```typescript
import { z } from 'zod';

// Allowed values for each part
export const AVATAR_BASES = ['round', 'square', 'oval', 'heart', 'diamond'] as const;
export const AVATAR_SKIN_COLORS = ['#FFDBB4', '#EDB98A', '#D08B5B', '#AE5D29', '#694D3D', '#F8D5C2'] as const;
export const AVATAR_HAIR_STYLES = ['none', 'spiky', 'curly', 'long', 'buzz', 'mohawk', 'bob', 'ponytail', 'afro', 'wavy'] as const;
export const AVATAR_HAIR_COLORS = ['#2C1B18', '#4A3728', '#8B6E4E', '#D4A574', '#E8C07A', '#C62828', '#F57F17', '#6A1B9A', '#00897B', '#FF1493'] as const;
export const AVATAR_EYE_STYLES = ['round', 'sleepy', 'star', 'wink', 'happy', 'angry', 'cool', 'sparkle'] as const;
export const AVATAR_MOUTH_STYLES = ['smile', 'grin', 'tongue', 'oh', 'smirk', 'flat', 'teeth', 'cat'] as const;
export const AVATAR_ACCESSORIES = ['none', 'glasses', 'sunglasses', 'hat', 'cap', 'headband', 'crown', 'earring', 'bandana', 'horns'] as const;
export const AVATAR_ACCESSORY_COLORS = ['#000000', '#FFFFFF', '#FF1493', '#00FFFF', '#BFFF00', '#8B5CF6', '#FF6B35', '#FFD700'] as const;

export const customAvatarSchema = z.object({
  base: z.enum(AVATAR_BASES),
  skinColor: z.enum(AVATAR_SKIN_COLORS),
  hair: z.enum(AVATAR_HAIR_STYLES),
  hairColor: z.enum(AVATAR_HAIR_COLORS),
  eyes: z.enum(AVATAR_EYE_STYLES),
  mouth: z.enum(AVATAR_MOUTH_STYLES),
  accessory: z.enum(AVATAR_ACCESSORIES),
  accessoryColor: z.enum(AVATAR_ACCESSORY_COLORS),
});

export type CustomAvatarConfig = z.infer<typeof customAvatarSchema>;
```

### 1.2 — Update Shared Avatar Type (`fe-next/shared/types/game.ts`)
Add `customAvatar?: CustomAvatarConfig` to existing `Avatar` interface:
```typescript
export interface Avatar {
  avatarImage?: string;
  profilePictureUrl?: string | null;
  customAvatar?: CustomAvatarConfig;  // NEW
  emoji?: string;     // @deprecated
  color?: string;     // @deprecated
}
```

### 1.3 — Database Migration (`fe-next/supabase/migrations/20260312000000_add_custom_avatar.sql`)
```sql
-- Add custom avatar config to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT NULL;

-- Add to leaderboard
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT NULL;

-- Add to daily_puzzle_attempts
ALTER TABLE daily_puzzle_attempts ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT NULL;

-- Update leaderboard sync trigger to include avatar_config
CREATE OR REPLACE FUNCTION sync_leaderboard_avatar()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leaderboard
  SET avatar_image = NEW.avatar_image,
      profile_picture_url = NEW.profile_picture_url,
      avatar_config = NEW.avatar_config
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update daily_puzzle_leaderboard view to include avatar_config
-- (Check existing view definition first and add COALESCE for avatar_config)
```

### 1.4 — Update Supabase Select Queries (`fe-next/lib/supabase.ts`)
Add `avatar_config` to all profile select strings: minimal, overview, settings, full.

### 1.5 — Update Backend Types
- `fe-next/backend/modules/avatarConfig.ts` — add `CustomAvatarConfig` import
- `fe-next/backend/handlers/avatarHandler.ts` — accept `customAvatar` in Zod schema, store in game state
- Update `GameUser.avatar` type to include `customAvatar?: CustomAvatarConfig`

### 1.6 — Update Profile Management
- `fe-next/contexts/auth/hooks/useProfileManagement.ts` — save/load `avatar_config`
- `fe-next/contexts/auth/authTypes.ts` — add `avatar_config?: CustomAvatarConfig` to `ProfileData`
- `fe-next/app/api/random-avatar/route.ts` — optionally generate random custom avatar config

---

## Phase 2: Avatar Builder — UI Components

### 2.1 — SVG Part Libraries (`fe-next/components/avatar/parts/`)
Create composable SVG components for each part category:
- `BaseParts.tsx` — 5 face shapes (round, square, oval, heart, diamond)
- `HairParts.tsx` — 10 hair styles as SVG paths
- `EyeParts.tsx` — 8 eye styles
- `MouthParts.tsx` — 8 mouth styles
- `AccessoryParts.tsx` — 10 accessories

Each exports a function: `(props: { color?: string }) => JSX.Element`

### 2.2 — Avatar Renderer (`fe-next/components/avatar/AvatarRenderer.tsx`)
```typescript
interface AvatarRendererProps {
  config: CustomAvatarConfig;
  size?: number; // px, default 64
  className?: string;
}
```
- Renders SVG by composing layers: base → hair (back) → face → eyes → mouth → accessory → hair (front)
- Memoized for performance
- Supports all existing size variants (sm/md/lg/xl/2xl)

### 2.3 — Avatar Builder Modal (`fe-next/components/avatar/AvatarBuilderModal.tsx`)
- Full-screen/large modal with:
  - Live preview (large, centered, 160px)
  - Category tabs: Base, Hair, Eyes, Mouth, Accessories (neo-brutalist tab buttons)
  - Option grid for selected category (scrollable)
  - Color picker strip for relevant colors (skin, hair, accessory)
  - "Randomize" button (shuffle icon)
  - "Save" / "Cancel" buttons
- Neo-brutalist styling: bg-neo-navy, border-3, shadow-hard, rounded-neo
- All labels use `t()` for i18n

### 2.4 — Update Avatar Display Component (`fe-next/components/Avatar.tsx`)
Priority chain:
1. `customAvatar` config → render via `AvatarRenderer`
2. `avatarImage` (old system) → render PNG
3. `profilePictureUrl` → render OAuth pic
4. Fallback → default avatar

### 2.5 — Update Existing Pickers
- `fe-next/components/EmojiAvatarPicker.tsx` — add "Build Custom" tab/button that opens AvatarBuilderModal
- `fe-next/components/multiplayer/AvatarSelector.tsx` — show custom avatar, "Edit" opens builder
- `fe-next/components/join/AvatarSelectorButton.tsx` — preview custom avatar

---

## Phase 3: Landing Page Redesign

### 3.1 — New Landing Components

#### `fe-next/components/landing/LandingHero.tsx`
Split hero: LEFT = mascot (IdleMascotWithEntrance, 160px) + title + subtitle + "PLAY NOW" CTA button. RIGHT = LandingLeaderboardPreview. On mobile: stacked, leaderboard below CTA.

#### `fe-next/components/landing/LandingLeaderboardPreview.tsx`
Neo-brutalist card (bg-neo-navy-light, border-3, shadow-hard-lg, rounded-neo-lg). Shows top 5 players with:
- Rank badge (gold/silver/bronze tier colors for 1-3, neo-gray for 4-5)
- Avatar (uses new Avatar component — shows custom avatars!)
- Player name
- Score in neo-lime
- "View Full Leaderboard →" link at bottom

#### `fe-next/components/landing/LandingSocialProofBar.tsx`
4 stat pills in horizontal row. **CRITICAL: Only show dynamic stats when meaningful:**
```typescript
const pills = [];
// Static — always show
pills.push({ label: t('landing.gameModes'), value: '5', bg: 'bg-neo-lime' });
pills.push({ label: t('landing.languages'), value: '4', bg: 'bg-neo-purple' });
// Dynamic — threshold gated
if (gamesToday > 100) pills.push({ label: t('landing.gamesToday'), value: gamesToday.toLocaleString(), bg: 'bg-neo-pink' });
if (activePlayers > 10) pills.push({ label: t('landing.activePlayers'), value: activePlayers.toLocaleString(), bg: 'bg-neo-cyan' });
// Don't render the bar at all if fewer than 3 pills
if (pills.length < 3) return null;
```
Each pill: border-2 black, shadow-hard-sm, rounded-neo-pill, font-bold text-neo-black.

#### `fe-next/components/landing/LandingTopWords.tsx`
Horizontal scroll of 3-4 top words found today. Each word rendered as letter tiles (individual squares, border-2 black, shadow-hard-sm, bg-neo-navy, text-neo-white, font-black). Score in tilted neo-lime badge. Data from daily challenge or recent games.

#### `fe-next/components/landing/LandingChallengeCards.tsx`
Replaces LandingDesktopCards with competitive-stat layout:
- Multiplayer (pink) + Single Player (cyan) as large equal cards in 2-col
- Daily Challenge (yellow-amber) full-width with streak + "Only X% solved" stat
- Adventure (lime) full-width with level stat
- Each card reuses ModeCard but with new `challengeStat` prop
- Stats are threshold-gated: don't show "Beat X players" if X < 5

#### `fe-next/components/landing/LandingYourRank.tsx`
For authenticated users only. Shows: rank badge, rank name, XP progress bar (neo-lime fill), "X points to next rank". Card: bg-neo-navy-light, border-3, shadow-hard-lg.

#### `fe-next/components/landing/LandingHallOfFame.tsx`
Horizontal scroll of 5 weekly champion cards. Portrait cards (160x200), neo-cream bg, border-3 black, shadow-hard, alternating rotation. Crown icon, avatar, name, best word, score.

#### `fe-next/components/landing/LandingBottomCTA.tsx`
Full-width banner: bg-gradient neo-pink to neo-purple, border-3, shadow-hard-lg. "Ready to Compete?" title, subtitle, large "START PLAYING" button (neo-lime).

#### `fe-next/components/landing/LandingAvatarTeaser.tsx`
Small card teasing custom avatars: 3 sample custom avatar SVGs (48px each), "Design your unique look" text, arrow link to profile/avatar builder. bg-neo-purple/20, border-2 neo-purple/40, rounded-neo-lg.

### 3.2 — Update ModeCard (`fe-next/components/landing/ModeCard.tsx`)
Add optional `challengeStat` prop:
```typescript
challengeStat?: {
  text: string;       // e.g., "Only 23% solved"
  icon?: ReactNode;   // e.g., flame icon
};
```
Renders as a small badge inside the card.

### 3.3 — Data Hooks
- `fe-next/hooks/useLandingStats.ts` — aggregates: games today, active players (from existing `useLiveRoomStats`), top words (new query)
- `fe-next/hooks/useTopPlayers.ts` — fetches top 5 from leaderboard table
- `fe-next/hooks/useHallOfFame.ts` — weekly champions query
- `fe-next/hooks/useDailySolveRate.ts` — percentage of players who solved daily challenge

### 3.4 — Rewire LandingView (`fe-next/components/landing/LandingView.tsx`)
Replace current layout with:
```
<Header />
<LandingHero />           — mascot + CTA + leaderboard preview
<LandingSocialProofBar />  — conditional stat pills
<LandingAvatarTeaser />    — "Create Your Avatar" teaser
<LandingTopWords />        — letter tile words scroll
<LandingChallengeCards />  — competitive mode cards
<LandingYourRank />        — auth'd users only
<LandingHallOfFame />      — weekly champions
<LandingBottomCTA />       — final conversion banner
<LandingSEOSection />      — keep for SEO (unchanged)
```
Keep LandingMobileCards for mobile landscape (update with competitive stats).

### 3.5 — Update LandingMobileCards
Add challenge stats to mobile cards. Same threshold gating.

---

## Phase 4: Integration & Polish

### 4.1 — Avatar in All Displays
Update these components to render custom avatars via fallback chain:
- `fe-next/components/game/CompactLeaderboard.tsx`
- `fe-next/components/daily/DailyLeaderboard.tsx`
- `fe-next/components/leaderboard/NearRankIndicator.tsx`
- `fe-next/components/results/ResultsPlayerCard.tsx`
- `fe-next/components/multiplayer/RoomListView.tsx`
- Any other component that renders `<Avatar />`

### 4.2 — i18n (all 4 languages: en, he, sv, ja)
New translation keys needed:
```
# Avatar builder
avatar.builder.title
avatar.builder.base / .hair / .eyes / .mouth / .accessories
avatar.builder.skinColor / .hairColor / .accessoryColor
avatar.builder.randomize / .save / .cancel
avatar.builder.buildCustom

# Landing page
landing.playNowFree
landing.gamesToday / .activePlayers / .gameModes / .languages
landing.todaysTopWords / .todaysTopPlayers
landing.challengeStat.beatPlayers / .highScore / .solvedPercent / .levelWall
landing.yourRank / .pointsToNext
landing.hallOfFame / .weeklyChampion
landing.readyToCompete / .startPlaying
landing.createAvatar / .designYourLook
```

### 4.3 — Tests (TDD per CLAUDE.md)
- `shared/types/__tests__/customAvatar.test.ts` — Zod schema validation
- `components/avatar/__tests__/AvatarRenderer.test.tsx` — renders each part type
- `components/avatar/__tests__/AvatarBuilderModal.test.tsx` — interaction tests
- `components/landing/__tests__/LandingSocialProofBar.test.tsx` — threshold logic
- `components/landing/__tests__/LandingHero.test.tsx`
- `components/landing/__tests__/LandingChallengeCards.test.tsx`
- `backend/handlers/__tests__/avatarHandler.test.ts` — custom avatar socket flow

### 4.4 — Migration Path
- Existing users keep food avatars until they customize
- New users see avatar builder during onboarding (after name entry)
- `avatar_image` stays in DB — never removed
- Display priority: `avatar_config` > `avatar_image` > `profile_picture_url` > fallback

---

## Execution Order

```
Phase 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6  (sequential — types feed everything)
Phase 2.1 → 2.2 → 2.3 → 2.4 → 2.5          (sequential — parts feed renderer feeds builder)
Phase 3.1 → 3.2 → 3.3 → 3.4 → 3.5          (can start after Phase 1.1 done)
Phase 4.1 → 4.2 → 4.3 → 4.4                 (after Phase 2 + 3 done)
```

Phase 2 and Phase 3 can run in PARALLEL after Phase 1 completes.

---

## Files to Create (new)
1. `fe-next/shared/types/customAvatar.ts`
2. `fe-next/supabase/migrations/20260312000000_add_custom_avatar.sql`
3. `fe-next/components/avatar/AvatarRenderer.tsx`
4. `fe-next/components/avatar/AvatarBuilderModal.tsx`
5. `fe-next/components/avatar/parts/BaseParts.tsx`
6. `fe-next/components/avatar/parts/HairParts.tsx`
7. `fe-next/components/avatar/parts/EyeParts.tsx`
8. `fe-next/components/avatar/parts/MouthParts.tsx`
9. `fe-next/components/avatar/parts/AccessoryParts.tsx`
10. `fe-next/components/landing/LandingHero.tsx`
11. `fe-next/components/landing/LandingLeaderboardPreview.tsx`
12. `fe-next/components/landing/LandingSocialProofBar.tsx`
13. `fe-next/components/landing/LandingTopWords.tsx`
14. `fe-next/components/landing/LandingChallengeCards.tsx`
15. `fe-next/components/landing/LandingYourRank.tsx`
16. `fe-next/components/landing/LandingHallOfFame.tsx`
17. `fe-next/components/landing/LandingBottomCTA.tsx`
18. `fe-next/components/landing/LandingAvatarTeaser.tsx`
19. `fe-next/hooks/useLandingStats.ts`
20. `fe-next/hooks/useTopPlayers.ts`
21. `fe-next/hooks/useHallOfFame.ts`
22. `fe-next/hooks/useDailySolveRate.ts`
23. Tests (7+ files)

## Files to Modify (existing)
1. `fe-next/shared/types/game.ts` — add customAvatar to Avatar interface
2. `fe-next/components/Avatar.tsx` — add customAvatar rendering priority
3. `fe-next/utils/avatarConfig.ts` — add random custom avatar generator
4. `fe-next/lib/supabase.ts` — add avatar_config to selects
5. `fe-next/contexts/auth/authTypes.ts` — add avatar_config to ProfileData
6. `fe-next/contexts/auth/hooks/useProfileManagement.ts` — save/load avatar_config
7. `fe-next/backend/handlers/avatarHandler.ts` — accept customAvatar
8. `fe-next/backend/modules/avatarConfig.ts` — add custom avatar types
9. `fe-next/components/EmojiAvatarPicker.tsx` — add "Build Custom" option
10. `fe-next/components/multiplayer/AvatarSelector.tsx` — show custom avatar
11. `fe-next/components/join/AvatarSelectorButton.tsx` — preview custom avatar
12. `fe-next/components/landing/LandingView.tsx` — rewire to new components
13. `fe-next/components/landing/LandingMobileCards.tsx` — add challenge stats
14. `fe-next/components/landing/ModeCard.tsx` — add challengeStat prop
15. `fe-next/app/api/random-avatar/route.ts` — support custom avatar generation
16. Translation files (en.json, he.json, sv.json, ja.json)
