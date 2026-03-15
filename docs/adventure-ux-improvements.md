# Adventure Mode: GameHeader + GameSidebar UX Improvements

Design spec for improving visual hierarchy, mobile space efficiency, and interaction patterns.
System context: Neo-brutalist dark theme, Tailwind CSS, Framer Motion, 4-language support including RTL Hebrew.

---

## GameHeader.tsx — Design Specification

### Problem Summary

The header has two score displays: one hidden on mobile (`hidden sm:flex`) and a second compact version shown only on mobile (`flex sm:hidden`). This dual-display pattern is a maintenance hazard and creates inconsistency — the two renders use different font sizes (`text-lg` vs `text-sm`) so the number appears to visually "jump" in size when crossing the `sm` breakpoint. Additionally, the level label uses `hidden sm:inline` / `sm:hidden` to swap between "World" and "W" — readable intent but creates four conditional text nodes for two words. The timer and control buttons are visually equal in weight, which undercuts the timer's role as the most critical game-state indicator.

---

### Proposed Layout — Single Unified Score Display

**Core principle:** One score element, always visible, size scales via container query. Eliminate the dual-render entirely.

#### Left section — Level badge

Current: `flex items-center gap-2 sm:gap-4`
Proposed: `flex items-center gap-2`

The outer gap does not need a responsive variant because the badge itself should be the only left element. Moving the score out of the left section (see below) removes the need for the larger `sm:gap-4`.

Level badge — current class:
```
px-2 sm:px-3 py-1 sm:py-1.5 rounded-neo border-2 border-neo-white/10
```

Proposed class:
```
px-2 py-1 rounded-neo border-2 border-neo-white/20 shadow-hard-sm
```

Rationale: The `sm:` padding variants add noise without meaningful visual change. Increasing border opacity from `/10` to `/20` gives the badge a more defined edge against the dark header background — current `/10` is nearly invisible on most world themes.

Level text — replace the four-node `hidden sm:inline` / `sm:hidden` pattern:

Before (four nodes):
```tsx
<span className="text-xs text-neo-white/60 hidden sm:inline">{t('adventure.world')}</span>
<span className="text-xs text-neo-white/60 sm:hidden">W</span>
<span className="font-black text-neo-white">{worldNumber}</span>
<span className="text-neo-white/30">/</span>
<span className="text-xs text-neo-white/60 hidden sm:inline">{t('adventure.level')}</span>
<span className="text-xs text-neo-white/60 sm:hidden">L</span>
<span className={cn('font-black', hudTheme.levelBadgeText)}>{levelNumber}</span>
```

After (two nodes, always abbreviated, full label in aria-label):
```tsx
<span className="text-[10px] font-mono text-neo-white/50 uppercase">
  W{worldNumber} · L{levelNumber}
</span>
```

Add `aria-label={`${t('adventure.world')} ${worldNumber}, ${t('adventure.level')} ${levelNumber}`}` to the parent badge `div`. The abbreviation is visually unambiguous in context (game interface) and recovers ~8px horizontal space on mobile. The MapPin icon already communicates location so the full word label is redundant.

#### Center section — Score (new, always visible)

Remove the left-section score (`hidden sm:flex`) and the right-section compact score (`flex sm:hidden`). Replace with a single centered element using `position: absolute` so it does not affect left/right flex layout:

```tsx
<div
  className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
  aria-live="polite"
  aria-atomic="true"
  aria-label={t('common.score')}
>
  <span className="text-[9px] font-mono text-neo-white/40 uppercase tracking-widest leading-none">
    {t('common.score')}
  </span>
  <RollingNumber
    value={score}
    variant="white"
    className="text-xl font-black leading-tight tabular-nums"
  />
</div>
```

Visual treatment: no background card. The number floats on the header bg. This keeps it lightweight while being prominent. `text-xl` is larger than either current variant (`text-lg` desktop / `text-sm` mobile) — score is the primary feedback loop and deserves the most visual weight after the timer.

The parent `<header>` needs `relative` added to its class list for the absolute child to anchor correctly.

#### Right section — Timer elevated, controls de-emphasized

Current right section class: `flex items-center gap-2 sm:gap-3`
Proposed: `flex items-center gap-3`

**Timer visual treatment — current vs proposed:**

The `AdventureTimer` renders at `size="compact"` with no additional wrapper. It blends into the row. Wrap it:

```tsx
<div className={cn(
  'flex items-center justify-center',
  'px-3 py-1 rounded-neo',
  'border-2 border-neo-white/20',
  'bg-neo-black/40',
  'shadow-hard-sm',
  timeRemaining <= 10 && 'border-neo-red/60 bg-neo-red/10 animate-neo-pulse'
)}>
  <AdventureTimer timeRemaining={timeRemaining} size="compact" />
</div>
```

This gives the timer a defined container — visually grouped, distinct from buttons. The conditional urgent state (<=10s) adds a red border pulse without changing the timer component itself.

**Control buttons — reduce visual noise:**

Current pause button when active: `bg-neo-lime text-neo-black` — bright lime is high contrast but lime is already used for "completed objectives" in the sidebar. Using the same color for a control button creates conflicting semantics.

Proposed pause button:
- Active (playing): `bg-neo-white/10 text-neo-white hover:bg-neo-white/20 border border-neo-white/10`
- Paused (show resume): `bg-neo-yellow text-neo-black border-2 border-neo-black shadow-hard-sm`

Neo-yellow is the system's primary interactive color (see design-system.md). Using it for "resume" (a call to action) is semantically cleaner than lime.

Exit button — current: `bg-neo-white/5 text-neo-white/60 hover:bg-neo-red/20 hover:text-neo-red`
Proposed: same, but add `border border-neo-white/5` for visual grouping consistency with pause button.

Both buttons keep `min-w-[44px] min-h-[44px]` — correct for touch targets, do not change.

#### Full header layout summary — mockup description

```
[ W1·L3 badge (MapPin) ]   [ SCORE / 1,240 (center) ]   [ [00:45] [||] [->] ]
```

On mobile this reads identically — no elements hide, no text swaps. The score number is always `text-xl`, centered. The badge is always abbreviated. The timer is always in its pill container.

#### RTL note

The centered score uses `absolute left-1/2 -translate-x-1/2` which is direction-agnostic. The level badge MapPin icon should use `me-1.5` (logical) instead of `mr-1.5` if that class exists in the current config, or use the existing `gap-1.5` on the flex row (already correct). The exit icon `LogOut` from Lucide renders as an arrow — in RTL this points the wrong direction. Add `rtl:scale-x-[-1]` to the icon class.

---

## GameSidebar.tsx — Design Specification

### Problem Summary

The mobile chip bar is 96px tall (`h-24`). On a 667px-tall phone (iPhone SE), that is 14.4% of screen height consumed by a strip that shows partially-cropped chips. The horizontal scroll is invisible — there is no scroll indicator and users have no affordance that more chips exist off-screen. Objective chips have no visual weight differentiation between primary and secondary objectives beyond a faint border color change. The desktop sidebar "Objectives Card" has a heading icon that is 28x28px (`w-7 h-7`) — proportionally large for a `text-xs` heading beside it. The hint button is well-designed but the auto-hint prompt (`hintAvailable`) and the adaptive difficulty hint (`hintLevel`) can both appear simultaneously, creating two competing yellow/cyan banners below the button.

---

### Proposed Layout — Mobile Chip Bar

#### Reduce height from h-24 (96px) to h-14 (56px)

The chips are `py-1` with a `h-1` progress bar inside. Total chip height at current padding is approximately 44px. The bar's `h-full` at 96px means chips are vertically centered in 52px of empty space. Reducing to 56px eliminates dead space while keeping the 44px chip centered with 6px top/bottom breathing room.

Change: `h-24` → `h-14` on the mobile container div.

Adjust chip padding to match:
Current: `px-2 py-1`
Proposed: `px-2.5 py-1` — keep vertical, add a small horizontal increase so the progress bar has more room.

#### Add scroll fade gradient as scroll affordance

After the last chip and before the divider, the user has no visual signal that the row is scrollable. Add a right-edge fade using a pseudo-element or a sibling overlay div:

```tsx
<div className="relative lg:hidden flex-shrink-0 h-14">
  <div className="flex flex-row items-center gap-2 px-2 h-full overflow-x-auto scrollbar-hide">
    {/* chips */}
  </div>
  {/* Scroll fade affordance */}
  <div className="pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-neo-navy/80 to-transparent" />
</div>
```

The `end-0` logical property works for both LTR and RTL — in Hebrew the fade appears on the left edge (correct, since scroll starts from right).

#### Visual priority for primary objectives

Currently primary objectives get `border-neo-yellow/40` vs secondary `border-neo-white/10` — a subtle difference that is easy to miss at a glance.

Proposed: primary objective chips get a left-border accent using `border-s-neo-yellow border-s-2` (logical start-border) and `border-neo-white/10` on remaining three sides. This creates a strong visual signal without inflating the chip.

Class change for primary chips:
```
Before: bg-neo-yellow/10 border-neo-yellow/40
After:  bg-neo-yellow/10 border-neo-white/15 border-s-2 border-s-neo-yellow
```

Completed chips stay: `bg-neo-lime/20 border-neo-lime` — no change, the full border on completion is a satisfying completion state.

#### Hint chip — add min-h for touch target

Current: `px-2 py-1` with no explicit height. On mobile the touch target may be under 44px.
Proposed: `px-2 py-1 min-h-[36px] min-w-[56px]` — 36px is acceptable for a secondary action inside a constrained chip bar where 44px is not achievable without expanding the bar height.

Add `aria-label={t('adventure.game.hint')}` to the button in addition to the visible text label (belt-and-suspenders for screen readers). Add `aria-disabled="true"` alongside `disabled` when hints are unavailable — some assistive tech does not announce native `disabled` on custom-styled buttons.

---

### Proposed Layout — Desktop Sidebar

#### Objectives Card header — resize icon container

Current: `w-7 h-7` icon container with `text-xs` heading.
Proposed: `w-5 h-5` — the icon should match the heading's visual weight. The current 28px container overpowers a 12px uppercase heading.

```
Before: w-7 h-7 rounded-neo bg-neo-yellow/20 border-2 border-neo-yellow/40
After:  w-5 h-5 rounded-neo bg-neo-yellow/20 border border-neo-yellow/40
```

The icon inside: `w-3.5 h-3.5` → `w-3 h-3` to match.

#### Hint section — resolve competing banner states

Currently `showAutoHint` and `hintLevel !== 'none'` can render simultaneously: a yellow "hint available" banner and a cyan adaptive difficulty banner both below the hint button. These are logically redundant — if the user is being shown an adaptive hint, the "hint available" nudge is already moot.

Proposed render priority (mutually exclusive):
1. If `currentHint` is set: show the green hint display card. Hide the other two.
2. Else if `hintLevel !== 'none'`: show only the adaptive difficulty hint (cyan).
3. Else if `showAutoHint`: show only the "hint available" nudge (yellow).

Implementation note (for developer): wrap the three `AnimatePresence` blocks in a single conditional chain. This is a logic change, not just a style change — flag for the developer to verify the intended UX with the product owner before implementing.

Visual improvement for the "hint available" nudge (state 3):

Current: `bg-neo-yellow/20 border-2 border-neo-yellow/50 text-center`
Proposed: Add a pulsing left border accent instead of the flat card treatment, and change from centered text to left-aligned with an icon:

```
bg-neo-yellow/10 border border-neo-white/10 border-s-2 border-s-neo-yellow
```

This visually connects it to the hint button above (same border accent system as the primary objective chips) and reduces the "banner" feel that competes with the hint display card.

#### Desktop card — border treatment

Current objectives card: `border-3 border-neo-black/50` — a dark border on a dark background is nearly invisible. The `shadow-hard` adds depth but the border does not define the edge.

Proposed: `border-2 border-neo-white/10` — lighter border, slightly lighter opacity. This matches the header badge border treatment (`border-neo-white/20`) and creates consistent depth language across the HUD.

---

## Accessibility Checklist

### GameHeader

| Element | Current state | Required change |
|---|---|---|
| Score container | No `aria-live` | Add `aria-live="polite" aria-atomic="true"` — score updates should be announced |
| Level badge | No programmatic label | Add `aria-label` with full translated text (not abbreviation) |
| Timer | Handled by AdventureTimer | Verify AdventureTimer has `role="timer"` and announces urgent state |
| Pause button | `aria-label` present | Correct — no change |
| Exit button | `aria-label` present | Correct — no change |
| LogOut icon | No RTL flip | Add `rtl:scale-x-[-1]` |

### GameSidebar

| Element | Current state | Required change |
|---|---|---|
| Objective chips | `data-testid` only | Add `role="status"` and `aria-label` with full objective text + progress |
| Progress bars | No accessible label | Add `role="progressbar" aria-valuenow={current} aria-valuemax={obj.target} aria-valuemin={0}` |
| Hint button (mobile) | No `aria-label` | Add `aria-label` — visible text alone is sufficient but add `aria-disabled` |
| Hint button (desktop) | No `aria-disabled` | Add `aria-disabled="true"` when disabled |
| Hint display card | No `role` | Add `role="status"` so screen readers announce when hint appears |
| Scroll chip bar | No scroll hint | Add `aria-label="Objectives, scroll for more"` on the container |

### Color contrast — items to verify

- `text-neo-white/40` (score label) on `hudTheme.headerBg`: may fail WCAG AA at 4.5:1 for small text. Consider `/60` minimum for 10px labels.
- `text-neo-white/50` (score label in current header): same concern.
- `text-neo-white/80` (objectives heading in desktop sidebar): verify against `bg-neo-black/40` — should pass at `/80`.
- `text-[10px]` chip labels: at 10px, WCAG AA requires 4.5:1. Neo-white on `bg-neo-black/40` at full opacity passes; ensure color opacity does not drop below `/80` for these labels.

---

## Summary of Measurable Improvements

| Metric | Before | After |
|---|---|---|
| Mobile header DOM nodes for level info | 6 (4 text + 2 numbers) | 2 (1 formatted string + number) |
| Score render count per breakpoint | 2 (dual display) | 1 (always visible, centered absolute) |
| Mobile chip bar height | 96px | 56px — saves 40px for grid space |
| Competing hint banners possible | Yes (2 simultaneous) | No (mutually exclusive logic) |
| Timer urgent state indicator | None | Red border pulse at <=10s |
| Scroll affordance in chip bar | None | Gradient fade overlay |
| Primary objective visual priority | Faint border color only | Strong start-border accent |
