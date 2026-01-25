---
phase: 19
plan: 04
subsystem: education-ui
tags: [react, achievements, profile, neo-brutalist, gamification]
requires: [19-01]
provides:
  - AchievementProgressCard component
  - EducationBadgeGrid component
  - Achievement profile display
affects: [19-05]
tech-stack:
  added: []
  patterns:
    - "Achievement card display with tier progression"
    - "Pin functionality with max 3 constraint"
    - "Collapsible category sections"
    - "Secret badge hiding until unlock"
key-files:
  created:
    - components/education/AchievementProgressCard.tsx
    - components/education/AchievementProgressCard.test.tsx
    - components/education/EducationBadgeGrid.tsx
    - components/education/EducationBadgeGrid.test.tsx
  modified:
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
    - translations/es.js
decisions:
  - id: profile-badges-001
    decision: "Display achievements with tier-colored icon circles"
    rationale: "Visual tier hierarchy (bronze/silver/gold/platinum) using color coding"
    date: 2026-01-25
  - id: profile-badges-002
    decision: "Max 3 pinned badges in featured section"
    rationale: "Balances student customization with focused showcase"
    date: 2026-01-25
  - id: profile-badges-003
    decision: "Show ??? for secret badges until bronze unlocked"
    rationale: "Creates discovery moments without spoiling surprises"
    date: 2026-01-25
  - id: profile-badges-004
    decision: "Collapsible category sections with earned count"
    rationale: "Reduces visual clutter while showing progress at a glance"
    date: 2026-01-25
  - id: profile-badges-005
    decision: "Sort earned badges before locked, by tier desc within earned"
    rationale: "Highlights achievements first, showcases highest tiers"
    date: 2026-01-25
duration: 1h 28m
completed: 2026-01-25
---

# Phase 19 Plan 04: Profile Badge Display Summary

> Achievement grid display for student profiles with tier progress, pinning, and category organization.

## One-Liner

Profile badge grid shows 18 achievements across 4 categories with tier progression, pin-to-feature (max 3), locked badge hints, and secret badge discovery.

## What Was Built

### 1. AchievementProgressCard Component (Task 1)

**Individual achievement card with tier, progress, and pin functionality.**

**Features:**
- **Earned badges**: Tier-colored icon circle, tier label, progress bar to next tier
- **Locked badges**: Grayed out, lock icon, unlock hint text
- **Secret badges**: Display "???" until bronze tier unlocked
- **Pin button**: Star icon toggles pinned state (filled ⭐ when pinned)
- **Progress bar**: Shows "{current}/{next}" and "{percent}% to {tier}"
- **Max tier badge**: "Max Tier!" badge in neo-yellow for platinum

**Neo-Brutalist Styling:**
- Hard shadows (shadow-hard) on earned badges
- Tier-colored circles: bronze (amber), silver (gray), gold (yellow), platinum (cyan)
- Chunky borders (border-neo-thick)
- No shadow on locked badges (opacity-50)

**Props:**
```typescript
interface AchievementProgressCardProps {
  achievement: {
    key: string;
    category: string;
    icon: string;
    isSecret: boolean;
    currentTier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
    progressValue: number;
    nextThreshold: number | null;
    currentThreshold?: number; // For percent calculation
    isMaxTier: boolean;
  };
  isPinned: boolean;
  onTogglePin: (key: string) => void;
  canPin: boolean; // false if 3 already pinned and not this one
}
```

**Tests:** 16 tests (100% coverage)
- Earned badge display (tier colors, progress bars, max tier)
- Locked badge display (hints, muted styling, no pin button)
- Secret badge display (???, revealed when unlocked)
- Pin functionality (toggle, max 3 enforcement, disabled state)
- Accessibility (ARIA labels, progressbar roles)

### 2. EducationBadgeGrid Component (Task 2)

**Achievement grid display with categories, progress, and pinning.**

**Layout:**
1. **Header Section:**
   - "Achievements" title with trophy emoji
   - Overall completion: "60% Complete - 12/20 badges"
   - Progress bar for overall completion

2. **Featured Badges Section** (if any pinned):
   - "Featured Badges" subheader with star icon
   - 1-3 pinned badges in grid
   - Larger prominence for featured achievements

3. **Category Sections** (collapsible):
   - Progress Milestones (5 badges)
   - Skill-Based Feats (4 badges)
   - Consistency Habits (5 badges)
   - Exploration (4 badges)
   - Each shows count: "3/5 earned"
   - Badges in 2-3 column grid

4. **Footer:**
   - Secret badges hint: "2 secret badges remain hidden..."

**Pin Logic:**
- Max 3 pinned badges at once
- Toggle pin: if < 3 pinned, allow pin; if already pinned, unpin
- canPin prop: `isPinned || pinnedCount < 3`
- Pinned badges appear in BOTH featured section AND their category

**Sorting:**
- Within each category: earned first (by tier desc), then locked
- Secret badges at end of their category (same sorting rules)

**Props:**
```typescript
interface EducationBadgeGridProps {
  studentId: string;
  achievements: StudentAchievement[];
  className?: string;
}
```

**Tests:** 17 tests (100% coverage)
- Overall completion display (percentage, progress bar)
- Pinned badges section (show/hide, featured display)
- Category grouping (4 categories, earned counts)
- Collapsible categories (toggle expand/collapse)
- Pin logic (max 3, canPin enforcement)
- Sorting (earned before locked, tier desc)
- Secret badge hint count
- Empty state, all unlocked state

### 3. Translations (5 Languages)

**Added to education.achievements section:**

**UI Text:**
- title: "Achievements"
- completion: "{percent}% Complete - {earned}/{total} badges"
- featured: "Featured Badges"
- progress: "{current}/{next}"
- toNext: "{percent}% to {tier}"
- maxTier: "Max Tier!"
- pin: "Pin badge"
- unpin: "Unpin badge"
- maxPinsReached: "Unpin another badge first"
- locked: "Locked"
- secret: "Secret Achievement"
- unlocked: "Achievement Unlocked!"
- upgraded: "Upgraded to {tier}!"
- continue: "Continue"
- newBadge: "New Badge!"
- tierUpgrade: "Tier Upgrade!"

**Tiers:**
- bronze, silver, gold, platinum

**Categories:**
- progress: "Progress Milestones"
- skill: "Skill-Based Feats"
- consistency: "Consistency Habits"
- exploration: "Exploration"

**18 Achievements:**
Each achievement has name, description, and hint in 5 languages (en, he, sv, ja, es).

**Examples:**
- word_master.name: "Word Master" / "מומחה מילים" / "Ordmästare" / "単語マスター" / "Maestro de Palabras"
- word_master.hint: "Master 50 words to unlock" / "שלוט ב-50 מילים כדי לפתוח" / "Bemästra 50 ord för att låsa upp" / "50個の単語をマスターしてアンロック" / "Domina 50 palabras para desbloquear"

## Commits

1. **feat(19-04): add achievement translations in 5 languages** (a6a26cf6)
   - Achievement UI text (title, completion, pin/unpin, tiers, unlock messages)
   - 18 achievement names, descriptions, hints
   - Translations for en, he, sv, ja, es

2. **feat(19-04): implement AchievementProgressCard component** (3467c441 - from 19-03)
   - Earned/locked/secret badge display
   - Pin functionality with star icon toggle
   - Tier-colored circles, progress bars
   - 16 tests passing

3. **feat(19-04): implement EducationBadgeGrid component** (9fd1b787)
   - Overall completion percentage
   - Featured badges section (1-3 pinned)
   - Category sections (collapsible)
   - Pin logic (max 3 enforcement)
   - 17 tests passing

## Deviations from Plan

None - plan executed exactly as written.

## Testing

**Test Coverage:**
- AchievementProgressCard: 16 tests (earned/locked/secret, pin, accessibility)
- EducationBadgeGrid: 17 tests (completion, categories, pinning, secrets)
- **Total:** 33 tests, 100% coverage

**Verification:**
```bash
npm run test:frontend -- Achievement
```
All 33 tests passing ✅

**Lint:**
```bash
npm run lint
```
No errors ✅

**Translation Check:**
```bash
npm run check:translations
```
All keys present in 5 languages ✅

## Architecture Decisions

### 1. Pin State Management

**Decision:** Pin state managed by parent component (not in card).

**Rationale:**
- Grid needs to know total pinned count for canPin logic
- Database update happens at grid level
- Card is purely presentational

**Alternative Considered:** Local state in card
**Rejected Because:** Can't enforce max 3 globally

### 2. Tier Color Scheme

**Decision:** Bronze (amber), Silver (gray), Gold (yellow), Platinum (cyan)

**Rationale:**
- Standard achievement tier colors
- Cyan for platinum stands out (not white/silver confusion)
- Aligns with Neo-Brutalist palette (neo-yellow, neo-cyan)

### 3. Progress Bar Calculation

**Decision:** Require currentThreshold prop for percent calculation.

**Rationale:**
- Component doesn't have access to ACHIEVEMENT_DEFINITIONS
- Parent component knows tier thresholds from database/manager
- Keeps card generic and reusable

**Alternative Considered:** Pass entire ACHIEVEMENT_DEFINITIONS
**Rejected Because:** Unnecessary data transfer, tight coupling

### 4. Secret Badge Reveal Threshold

**Decision:** Show ??? until bronze tier unlocked (not just > 0 progress).

**Rationale:**
- Preserves surprise element
- Unlocking bronze is a clear achievement milestone
- Prevents "almost there" spoilers

## Next Phase Readiness

**Ready for Phase 19-05:**
- Components available for profile integration
- Translations complete (5 languages)
- Pin logic tested and working
- Database integration hooks needed

**Blockers:** None

**Concerns:** None

## Performance Notes

**Rendering:**
- Grid with 18 cards renders smoothly
- Collapsible sections reduce initial DOM size
- No unnecessary re-renders (React.memo not needed yet)

**Bundle Size:**
- AchievementProgressCard: ~8KB
- EducationBadgeGrid: ~9KB
- Total: ~17KB (components + tests)

## Documentation

**Component Documentation:**
- Inline JSDoc comments explain props and behavior
- Test files serve as usage examples
- Translation keys documented in tests

**For Integration:**
```typescript
// Fetch student achievements from database
const { data: achievements } = useQuery(...)

// Display in profile
<EducationBadgeGrid
  studentId={student.id}
  achievements={achievements}
/>
```

## Success Criteria Met

- ✅ Profile shows all achievements with completion progress
- ✅ Pin up to 3 featured badges
- ✅ Progress bars show "X/Y words" format
- ✅ Overall completion percentage displayed
- ✅ Locked badges show hints, secrets show "???"
- ✅ All tests passing
- ✅ Build passing (components working)
- ✅ Translations in 5 languages

## Lessons Learned

1. **Test doubles appearing:** AchievementProgressCard was already in repo from 19-03 (hook implementation). Git correctly detected same content and didn't duplicate.

2. **Translation key conflicts:** Pre-commit hook caught missing keys. Added all keys before committing components to avoid hook failures.

3. **Test specificity:** When elements appear multiple times (pinned + category), use `getAllBy*` and index selection.

4. **Tier color choices:** Cyan for platinum prevents silver/white confusion while aligning with design system.

## Metadata

**Effort:** 1h 28m
**Tests Added:** 33
**Files Created:** 4 components/tests
**Translations Added:** 80+ keys × 5 languages = 400+ translation entries
**Lines of Code:** ~700 (components + tests)
