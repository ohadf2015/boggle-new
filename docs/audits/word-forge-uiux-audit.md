# Word Forge — UI/UX Audit

**Date:** 2026-03-31
**Auditor:** UI/UX Design Agent
**Scope:** All 8 Word Forge components + design system alignment + spec gap analysis
**Orientation:** Mobile-first, portrait, Balatro-inspired roguelike

Files audited:
- `components/wordForge/WordForgeGame.tsx`
- `components/wordForge/WordForgeGrid.tsx`
- `components/wordForge/WordForgeHUD.tsx`
- `components/wordForge/RuneBar.tsx`
- `components/wordForge/RunePicker.tsx`
- `components/wordForge/BossReveal.tsx`
- `components/wordForge/RunSummary.tsx`
- `components/wordForge/ScoreFeedback.tsx`
- `docs/designs/word-forge-mode.md` (design spec)
- `fe-next/.superdesign/init/theme.md` (design system)

---

## Summary

| Priority | Count |
|----------|-------|
| CRIT     | 3     |
| HIGH     | 7     |
| MED      | 9     |
| LOW      | 6     |
| **Total**| **25**|

---

## CRITICAL

---

### CRIT-1 — i18n — Raw translation keys rendered as visible text

**Files:** `RuneBar.tsx:56`, `RunePicker.tsx:126`
**Category:** Internationalization / Content

**Issue:**
`runes[inspecting].def.descriptionKey` and `rune.descriptionKey` are rendered directly as JSX text. They contain keys like `"wordForge.rune.vowelMiner.desc"`, not the localized string. All four supported languages (Hebrew, English, Swedish, Japanese) will show raw key strings. The rune `name` field (`rune.def.name`, `rune.name`) also appears to be a plain English string rather than going through the translation system.

**Impact:** All rune descriptions are broken for every user in every language. Core rune mechanic — the entire point of the pick-a-rune loop — is unreadable.

**Fix:**
```tsx
// RuneBar.tsx — inside inspect popup
- <p className="text-sm text-neo-black/80 font-neo-body">
-   {runes[inspecting].def.descriptionKey}
- </p>
+ <p className="text-sm text-neo-black/80 font-neo-body">
+   {t(runes[inspecting].def.descriptionKey)}
+ </p>

// RunePicker.tsx — inside card
- <p className="text-[10px] sm:text-xs text-neo-black/70 font-neo-body text-center leading-snug flex-1">
-   {rune.descriptionKey}
- </p>
+ <p className="text-[10px] sm:text-xs text-neo-black/70 font-neo-body text-center leading-snug flex-1">
+   {t(rune.descriptionKey)}
+ </p>
```

Similarly, rarity labels are raw English in both components. Add translation keys for `wordForge.rarity.common`, `wordForge.rarity.rare`, `wordForge.rarity.legendary` and use `t(...)`.

---

### CRIT-2 — Mobile — No safe area insets on HUD or RuneBar

**Files:** `WordForgeHUD.tsx:36`, `RuneBar.tsx:70`, `WordForgeGame.tsx:104`
**Category:** Mobile UX / Safe Areas

**Issue:**
The HUD uses `pt-3` with no top safe area padding. On iPhone with a notch or Dynamic Island, the round/timer/score row will render behind hardware. The RuneBar uses `py-3` with no bottom safe area. On iPhone and modern Android, the home indicator sits over the rune slots, making them partially or fully untappable.

The design system already defines the correct CSS variable:
```css
--mobile-bottom-safe: calc(var(--mobile-tab-bar-height) + env(safe-area-inset-bottom, 0px));
```
but it is unused in these components.

**Fix:**
```tsx
// WordForgeHUD.tsx
- <div className="bg-[#0A0A1A] border-b-3 border-neo-black px-4 pt-3 pb-2 space-y-2">
+ <div className="bg-[#0A0A1A] border-b-3 border-neo-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 space-y-2">

// RuneBar.tsx
- <div className="bg-[#0A0A1A] border-t-3 border-neo-black px-4 py-3 flex items-center justify-center gap-2">
+ <div className="bg-[#0A0A1A] border-t-3 border-neo-black px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-2">
```

For the idle, pickRune, bossReveal, and runOver full-screen views (`min-h-screen`), add `pt-safe` or wrap content in a container that accounts for `env(safe-area-inset-top)` via Tailwind's `safe-area` plugin or explicit inline style.

---

### CRIT-3 — Mobile — RunePicker overflows on 320px viewport (iPhone SE)

**File:** `RunePicker.tsx:95`
**Category:** Mobile Layout / Touch

**Issue:**
The three rune cards use `w-[110px]` with `gap-3` (12px). The minimum rendered width is `3 × 110 + 2 × 12 = 354px`. iPhone SE (1st/2nd gen) has a 320px CSS viewport. The cards will overflow the screen without scrolling affordance. The flex container has no `flex-wrap`, `overflow-x-auto`, or responsive width clamping.

**Fix (Option A — recommended, scales gracefully):**
```tsx
// RunePicker.tsx
- <div className="flex gap-3 sm:gap-4">
+ <div className="flex gap-2 sm:gap-4 justify-center">
  {offering.map((rune) => {
    return (
      <button
-       className="w-[110px] sm:w-[130px] ..."
+       className="w-[min(110px,30vw)] sm:w-[130px] ..."
```

**Fix (Option B — stack on very narrow screens):**
```tsx
- <div className="flex gap-3 sm:gap-4">
+ <div className="flex flex-wrap xs:flex-nowrap gap-2 sm:gap-4 justify-center">
```

Option A is preferred because it maintains the 3-card side-by-side layout (the visual design intent) on all modern phones while gracefully shrinking on very narrow viewports.

---

## HIGH

---

### HIGH-1 — Interaction — Silent failure on invalid word submission

**File:** `WordForgeGrid.tsx:69-77`
**Category:** Interaction Design / Feedback

**Issue:**
When `checkWord` returns false (word not in dictionary), or when a word is fewer than 3 letters, the path is cleared silently. No animation, no text, no haptic. In a timed game with 60 seconds, silent rejection creates two problems: players don't know whether their swipe was rejected by the dictionary or by a gesture misread, and they lose time re-attempting words they already know are invalid.

The TODO comment on line 73 acknowledges this: `// TODO: Show invalid word feedback (shake animation)`.

**Fix:**
Add a `lastResult` state that drives visual feedback:
```tsx
const [lastResult, setLastResult] = useState<'valid' | 'invalid' | 'short' | null>(null);

// In handleDragEnd:
if (path.length < 3) {
  setLastResult('short');
} else if (checkWord && !checkWord(word.toLowerCase())) {
  setLastResult('invalid'); // triggers animate-neo-shake on grid or preview
} else {
  onWordFound(word);
  setLastResult('valid');
}

// Clear after animation completes
useEffect(() => {
  if (lastResult) {
    const t = setTimeout(() => setLastResult(null), 400);
    return () => clearTimeout(t);
  }
}, [lastResult]);
```

Apply `animate-neo-shake` to the word preview `<span>` when `lastResult === 'invalid'`. Consider a red flash on the border of the preview chip. The `animate-neo-shake` keyframe already exists in the design system.

---

### HIGH-2 — Content — BossReveal missing target score and contextual tip

**File:** `BossReveal.tsx`
**Category:** Information Architecture / Game Design

**Issue:**
The design spec (`docs/designs/word-forge-mode.md:269-280`) shows two elements that are absent from the implementation:
1. The round's target score displayed on the reveal screen
2. A contextual tip that helps players adapt their strategy to the constraint

Without the target score, players cannot mentally plan before hitting READY. Without the tip, the boss round is just a penalty reveal rather than an interesting strategic moment.

**Fix:**
Pass `roundTarget` through `BossReveal` props and add a `tip` field to `BossConstraintDef`:
```tsx
// BossReveal.tsx — add to props
interface BossRevealProps {
  constraint: BossConstraintDef;
  round: number;
  roundTarget: number;  // add
  onReady: () => void;
}

// Inside the constraint card, after the description
<p className="text-base text-neo-black/80 font-neo-body leading-relaxed">
  {t(constraint.descriptionKey)}
</p>
<div className="mt-3 pt-3 border-t-2 border-neo-black/20 flex items-start gap-2">
  <span className="text-sm">💡</span>
  <p className="text-sm text-neo-black/70 font-neo-body italic">
    {t(constraint.tipKey)}
  </p>
</div>

// Below constraint card, above READY button
<p className="text-sm font-bold text-neo-cream/60 font-neo-body uppercase tracking-wide">
  {t('wordForge.target')}: <span className="text-tier-gold text-base">{roundTarget}</span>
</p>
```

---

### HIGH-3 — Content — RunSummary missing XP and meta-progression section

**File:** `RunSummary.tsx`
**Category:** Engagement / Retention

**Issue:**
The design spec (`docs/designs/word-forge-mode.md:290-312`) defines the run summary as showing Forge XP earned, a progress bar toward the next meta-unlock, and the name of that unlock. The implementation shows none of these. XP and unlocks are the meta-progression loop that motivates repeated play. Without this, players receive zero signal about long-term progress — the primary retention mechanic is invisible.

**Fix:**
Pass XP data from `WordForgeRunState` and render a progression section:
```tsx
// After the stats card, before runes used
{state.forgeXpEarned > 0 && (
  <div className="w-full max-w-sm space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold uppercase text-neo-cream/60 font-neo-body">
        {t('wordForge.forgeXp')}
      </span>
      <span className="text-neo-lime font-black font-neo-display">
        +{state.forgeXpEarned} ⭐
      </span>
    </div>
    {/* Progress bar */}
    <div className="h-3 bg-neo-cream/10 border-2 border-neo-black rounded-neo overflow-hidden">
      <div
        className="h-full bg-neo-purple transition-all duration-500"
        style={{ width: `${(state.forgeXpTotal % nextUnlockThreshold) / nextUnlockThreshold * 100}%` }}
      />
    </div>
    {state.nextUnlock && (
      <p className="text-xs text-neo-cream/50 font-neo-body text-center">
        {t('wordForge.nextUnlock')}: {t(state.nextUnlock.nameKey)}
      </p>
    )}
  </div>
)}
```

---

### HIGH-4 — Accessibility — No `aria-live` regions for dynamic game state

**Files:** `WordForgeHUD.tsx`, `WordForgeGrid.tsx`, `ScoreFeedback.tsx`
**Category:** Accessibility / Screen Reader

**Issue:**
The timer, score, progress bar, word preview, and score feedback popup all update continuously during gameplay. None use `aria-live` regions. Screen reader users receive no announcements when the timer hits critical thresholds, when a word is accepted, or when the round ends. The game is unplayable with assistive technology.

**Fix — minimum viable approach:**
```tsx
// WordForgeHUD.tsx — timer warning (don't announce every second, just the threshold)
<span
  className={cn('text-lg font-black font-neo-display tabular-nums', ...)}
  aria-live={isLowTime ? 'polite' : 'off'}
  aria-label={`${timeRemaining} ${t('wordForge.secondsRemaining')}`}
>
  ⏱ {timeRemaining}s
</span>

// WordForgeGrid.tsx — word preview
<div className="h-8 flex items-center justify-center" aria-live="polite" aria-atomic="true">
  {currentWord.length > 0 && (
    <span ...>{currentWord}</span>
  )}
</div>

// ScoreFeedback.tsx — score popup
<div
  className={cn('absolute bottom-20 ...', ...)}
  aria-live="assertive"
  aria-atomic="true"
>
```

---

### HIGH-5 — Accessibility — No reduced motion handling

**Files:** `WordForgeHUD.tsx:51`, `BossReveal.tsx:23`, `ScoreFeedback.tsx:87`, `RunePicker.tsx` (implied stagger animations)
**Category:** Accessibility / Motion

**Issue:**
Multiple components use `animate-pulse-subtle` (timer), `animate-neo-pop` (boss card), and `animate-score-pop` (high score values). None check `prefers-reduced-motion`. The codebase provides `AdaptiveMotion` and `AdaptiveAnimatePresence` from `components/motion/AdaptiveMotion` specifically for this purpose, but Word Forge uses none of them.

**Fix:**
For Framer Motion elements, wrap with `AdaptiveMotion`. For pure CSS animations, use the Tailwind `motion-safe:` / `motion-reduce:` variants:
```tsx
// WordForgeHUD.tsx
- isLowTime ? 'text-neo-red animate-pulse-subtle' : 'text-neo-cream'
+ isLowTime ? 'text-neo-red motion-safe:animate-pulse-subtle' : 'text-neo-cream'

// BossReveal.tsx
- <div className="... animate-neo-pop">
+ <div className="... motion-safe:animate-neo-pop">

// ScoreFeedback.tsx
- displayScore.totalScore >= 50 ? 'text-lg animate-score-pop' : 'text-base'
+ displayScore.totalScore >= 50 ? 'text-lg motion-safe:animate-score-pop' : 'text-base'
```

---

### HIGH-6 — Design Consistency — Custom buttons don't use the shared Button component

**Files:** All 8 components
**Category:** Design System / Maintainability

**Issue:**
Every interactive button in Word Forge inlines the full neo-brutalist Tailwind string from scratch rather than using `components/ui/button.tsx` with CVA variants. The shared Button component provides standardized `focus-visible` ring (critical for keyboard navigation), proper `disabled` opacity states, and correct minimum touch targets (`h-12 min-h-[48px]` for default size, `h-11 min-h-[44px]` for sm). The inline versions have none of these.

Examples of missing focus ring:
- `BossReveal.tsx:52` — READY button
- `RunSummary.tsx:72` — TRY AGAIN button
- `WordForgeGame.tsx:54` — START RUN button
- `RunePicker.tsx:79` — CANCEL (text button, no focus styles at all)

**Fix:**
Import and use the shared Button component:
```tsx
import { Button } from '@/components/ui/button';

// BossReveal.tsx
- <button onClick={onReady} className="btn-neo bg-neo-lime ... px-8 py-4 text-lg ...">
+ <Button onClick={onReady} size="lg" variant="default">
    {t('wordForge.ready')}
+ </Button>

// RunePicker.tsx cancel button
- <button onClick={() => setSelectedRune(null)} className="text-sm text-neo-cream/50 underline mt-2">
+ <Button onClick={() => setSelectedRune(null)} variant="link" size="sm" className="text-neo-cream/50">
```

The rune card buttons in `RunePicker` and `RuneBar` are more custom and can remain inline, but must add explicit `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan` classes.

---

### HIGH-7 — Visual Hierarchy — No visual distinction for boss rounds in the HUD

**File:** `WordForgeHUD.tsx:41-44`
**Category:** Visual Hierarchy / Information Architecture

**Issue:**
During a boss round, the only visual indicator is a small emoji (`bossConstraint.def.icon`) appended after the round label in `text-neo-red` at `text-xs`. This is extremely subtle. Players who have just clicked READY past an elaborate boss reveal screen will be playing on a HUD that looks identical to normal rounds. The boss constraint name is not visible at all during gameplay — only the icon.

**Fix:**
When `bossConstraint` is active, transform the HUD top row to be clearly different:
```tsx
// WordForgeHUD.tsx — top row when boss is active
{bossConstraint ? (
  <div className="flex items-center gap-2 px-2 py-0.5 bg-neo-red/20 border border-neo-red/50 rounded-neo">
    <span className="text-neo-red text-sm">{bossConstraint.def.icon}</span>
    <span className="text-xs font-black uppercase text-neo-red font-neo-display tracking-wide">
      {bossConstraint.def.name}
    </span>
  </div>
) : (
  <span className="text-xs font-bold uppercase text-neo-cream/60 font-neo-body">
    {t('wordForge.round')} {round}/{maxRounds}
  </span>
)}
```

The progress bar could also change from `bg-tier-gold` to a pulsing `bg-neo-red` when boss is active, giving a persistent ambient reminder of the constraint.

---

## MEDIUM

---

### MED-1 — Layout — ScoreFeedback `absolute bottom-20` may overlap the grid on short phones

**File:** `ScoreFeedback.tsx:39`
**Category:** Mobile Layout

**Issue:**
The score feedback popup uses `absolute bottom-20` (80px from the bottom of its containing element). On phones under ~600px tall, this places the popup over the bottom rows of the 5×5 grid, obscuring tiles the player may be trying to swipe. The popup is `pointer-events-none` so taps pass through, but visual occlusion during a time-pressured word-finding task is disruptive.

**Fix:**
Position the feedback above the rune bar rather than absolutely within the game area. The rune bar is approximately 72px tall. Use `bottom-24` (96px) to clear it, or better, use a flex-column layout slot between the grid and the rune bar:
```tsx
// WordForgeGame.tsx — pull ScoreFeedback out of absolute positioning
// Place it in the column flow, between grid and RuneBar
<div className="flex-1 flex items-center justify-center px-4 py-2">
  <WordForgeGrid ... />
</div>

{/* Fixed-height feedback slot — won't shift layout */}
<div className="h-10 flex items-center justify-center px-4">
  <ScoreFeedback lastScore={run.lastWordScore} />
</div>

<RuneBar runes={run.state.runes} maxSlots={run.state.maxRuneSlots} />
```
Change `ScoreFeedback` from `absolute` to `relative` positioning.

---

### MED-2 — Touch Targets — Grid tiles may shrink below 44px on small/short viewports

**File:** `WordForgeGrid.tsx:143-159`
**Category:** Mobile UX / Touch Targets

**Issue:**
Grid tiles use `aspect-square` within a CSS grid that divides `game-board-frame`'s `--board-size`. The board size formula is `min(80vmin, calc(100vw - 32px), calc(100dvh - 220px))`. On a 320×568px device (iPhone SE), with 220px subtracted for HUD+RuneBar, the available height is 348px, giving a board of ~348px and tiles of ~65px — acceptable. However on landscape orientation or very short phones, `100dvh - 220px` could yield tiles under 44px. No `min-w` or `min-h` guard exists on the tile elements.

**Fix:**
The guard must go on `--board-size` in the `.game-board-frame` CSS rule, not on individual tile elements. Inside a `grid-template-columns: repeat(5, 1fr)` container, `min-w`/`min-h` on tiles does not constrain the track size — the grid can crush tiles below their declared minimum when the container itself is too small. Add a floor to the board size instead:

```css
/* globals.css — .game-board-frame */
.game-board-frame {
  /* 244px floor = 5 tiles × 44px + 4 gaps × 4px + 2 × 8px padding */
  --board-size: max(244px, min(80vmin, calc(100vw - 32px), calc(100dvh - 220px)));
}
```

On viewports where `244px` is the governing value, the board will overflow its container and the surrounding flex column will become scrollable — this is safer than crushing touch targets below the WCAG 44px minimum.

---

### MED-3 — Visual Hierarchy — Rune rarity relies solely on a 3px border color difference

**Files:** `RuneBar.tsx:12-21`, `RunePicker.tsx:17-21`
**Category:** Visual Hierarchy / Rarity Communication

**Issue:**
In the RuneBar, rune slots are `w-12 h-12` (48px). Common runes have `border-gray-400`, rare have `border-neo-purple`, legendary have `border-tier-gold`. The rare and legendary runes additionally get a subtle `ring` glow. Common runes have no differentiating treatment at all — no background tint, no icon badge, no label. In the RunePicker, the rarity badge (9px text) is the lowest-priority visual element, sitting at the bottom of the card below the description. For a game where rune rarity is a core strategic decision, the visual weight is inverted.

**Fix:**
In RunePicker, move the rarity badge above the rune name (or style it as a header accent), and give common runes a light gray background tint (`bg-gray-100`) to create positive distinction rather than treating common as "no treatment." For the RuneBar, add a 1-character rarity indicator character overlaid on common slots (`◆` for common, ★ for rare, ✦ for legendary) as an accessible fallback alongside color.

---

### MED-4 — Timer — No visual urgency escalation as time runs out

**File:** `WordForgeHUD.tsx:48-53`
**Category:** Interaction Design / Game Feel

**Issue:**
When `timeRemaining <= 10`, the timer switches from `text-neo-cream` to `text-neo-red` with `animate-pulse-subtle`. This is the only urgency escalation. The spec notes the timer should not be stressful (60s is generous), but in boss rounds or later rounds, missing the target is high-stakes. There is no color ramp (e.g., cream → amber → orange → red), no size increase, and no grid-level urgency (such as the vignette system used in Adventure mode).

**Fix:**
Add a three-stage urgency ramp:
```tsx
const isWarning = timeRemaining <= 20 && timeRemaining > 10;
const isCritical = timeRemaining <= 10;

<span className={cn(
  'text-lg font-black font-neo-display tabular-nums transition-colors duration-300',
  isCritical ? 'text-neo-red motion-safe:animate-pulse-subtle text-xl' :
  isWarning  ? 'text-[#FF6B35]' :  // ember orange from forge theme
               'text-neo-cream',
)}>
```

At `isCritical`, also consider applying a `ring-1 ring-neo-red/40` to the overall HUD border to signal urgency at the peripheral level.

---

### MED-5 — Onboarding — No tutorial or first-run guidance

**File:** `WordForgeGame.tsx` (idle phase)
**Category:** Onboarding / Learnability

**Issue:**
The idle screen shows title, subtitle, stats, and a START RUN button. There is no explanation of what runes are, how boss rounds work, or how the scoring formula operates. The design doc is explicit that the loop takes "30 seconds to learn" and the score math should be self-teaching — but self-teaching requires at least one exposure to the mechanics before the clock starts.

**Fix (low cost, high value):**
Add a collapsible "How to play" section to the idle screen using the existing accordion pattern. Show the three-step loop as a visual flow (SPELL → PICK → REPEAT). On the first run only (detectable via `run.progress.totalRuns === 0`), show a persistent overlay tooltip on the first rune pick explaining what rarity means. This is the minimum investment to prevent first-run abandonment.

---

### MED-6 — No word history visible during gameplay

**File:** `WordForgeGame.tsx` (playing phase)
**Category:** Information Architecture / Game Design

**Issue:**
The design spec does not explicitly include a word history list in the in-round screen, but similar word games (Boggle, Alphabear) universally show found words. Without a list, players cannot tell if they have already found a word (the grid path check prevents duplicate tile use per-word but not duplicate words across the round), and they cannot track progress other than via the score/progress bar.

**Fix:**
Add a horizontal scrolling list of found words below the word preview and above the grid. Keep it subtle:
```tsx
// In WordForgeGrid or as a sibling component in WordForgeGame
{foundWords.length > 0 && (
  <div className="flex gap-1 overflow-x-auto max-w-full px-2 py-1 scrollbar-none">
    {foundWords.map((w, i) => (
      <span key={i} className="text-[10px] text-neo-cream/40 font-neo-body uppercase shrink-0">
        {w}
      </span>
    ))}
  </div>
)}
```

This requires `foundWords` to be tracked in state alongside the current path, which is straightforward since `onWordFound` is already called per accepted word.

---

### MED-7 — Replace rune flow has no "you are replacing X" confirmation step

**File:** `RunePicker.tsx:49-85`
**Category:** Interaction Design / Error Prevention

**Issue:**
When rune slots are full and the player clicks a rune card, they are taken to a replace overlay showing the existing rune cards. Tapping any card immediately executes the replacement via `onPick(selectedRune, i)` — no confirmation. Discarding a legendary rune by accident (especially on a small phone with fat-finger taps) is an irreversible, run-ending mistake. The discard animation specified in the design doc ("card burns — shrink + fade + orange glow") is also unimplemented.

**Fix:**
Add a single confirmation step between tapping the rune to discard and executing the replace. The simplest approach is a two-tap confirmation: first tap highlights the target rune in red (destructive state), second tap within 1s confirms. Alternatively, show the incoming rune alongside the outgoing rune in a "Trade?" layout before confirming:
```tsx
// Replace overlay — add confirmation state
const [pendingReplace, setPendingReplace] = useState<number | null>(null);

// On first tap: set pendingReplace, show confirmation UI
// On second tap (or "confirm" button): call onPick(selectedRune, pendingReplace)
```

---

### MED-8 — No progress or loading state when dictionary is not yet loaded

**File:** `WordForgeGame.tsx:30,121`
**Category:** Loading States / User Feedback

**Issue:**
`dictLoaded` from `useDictionaryCache` is used to conditionally pass `checkWord` to the grid. When `dictLoaded === false`, `checkWord` is `undefined`, meaning all words are accepted without validation. There is no visual indicator that the dictionary is still loading. If a player starts a run before the dictionary loads and submits words, those words may be accepted even if invalid, creating an inconsistent experience once validation activates mid-round.

**Fix:**
Show a loading indicator on the START RUN button and disable it until the dictionary is ready:
```tsx
// WordForgeGame.tsx — idle screen
<button
  onClick={run.startRun}
  disabled={!dictLoaded}
  className={cn('btn-neo ...', !dictLoaded && 'opacity-60 cursor-wait')}
>
  {dictLoaded ? t('wordForge.startRun') : t('wordForge.loadingDictionary')}
</button>
```

If the game is already running when the dictionary loads (a race condition), show a subtle badge on the grid frame: `⚡ ${t('wordForge.validating')}`.

---

### MED-9 — Contrast — Progress bar score label at 10px with reduced opacity

**File:** `WordForgeHUD.tsx:72`
**Category:** Accessibility / Color Contrast

**Issue:**
The progress bar label renders `{roundScore}/{roundTarget}` at `text-[10px]` with `text-neo-black/70` over either `bg-tier-gold` (#FFD700) or `bg-neo-lime` (#BFFF00) fill — or over `bg-neo-cream/10` when the bar is empty. WCAG 2.1 AA requires 4.5:1 contrast for text below 18px (normal) or 14px (bold). At 10px with 70% opacity black on a yellow/lime background, the contrast is technically borderline but the font size is below any WCAG threshold. It will be illegible for users with any visual impairment.

**Fix:**
Remove the inline label from the progress bar fill. Instead, show the score/target in the HUD top row where it has more space and higher contrast:
```tsx
// WordForgeHUD.tsx — remove inline label from progress bar
- <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-neo-black/70">
-   {roundScore}/{roundTarget}
- </span>

// Move the score/target display to the top row, replacing or augmenting the raw score number
```

The score number already appears in the top row but without the target. Adding `/300` after it at the same size gives the context without the contrast problem.

---

## LOW

---

### LOW-1 — RTL — Shadow utilities may not all receive the RTL auto-flip

**Files:** `WordForgeGrid.tsx:155`, `RuneBar.tsx:43`, `BossReveal.tsx:32`
**Category:** Accessibility / RTL

**Issue:**
The design system defines RTL flip rules for `shadow-hard` and `shadow-hard-lg` via `[dir="rtl"]` selectors. However, `shadow-hard-cyan` (used on selected grid tiles) and `shadow-hard-xl` (used on boss card) do not appear to have RTL counterparts in the theme. Hebrew layout with unflipped hard shadows breaks the directional physicality of the neo-brutalist style.

**Fix:**
Verify that `shadow-hard-cyan` and `shadow-hard-xl` have corresponding RTL entries in `globals.css`. If not, add:
```css
[dir="rtl"] .shadow-hard-cyan { box-shadow: -4px 4px 0px var(--neo-cyan); }
[dir="rtl"] .shadow-hard-xl   { box-shadow: -8px 8px 0px rgb(var(--neo-black)); }
```

---

### LOW-2 — Animation — Rune trigger animations not wired

**File:** `RuneBar.tsx`, `WordForgeGame.tsx`
**Category:** Game Feel / Animation

**Issue:**
The design spec specifies that when a rune triggers during a word score, the corresponding rune card in the RuneBar should "lift briefly, glow pulse." The `ScoreFeedback` component knows which runes fired (via `runeEffects`), but there is no communication back to `RuneBar` to animate the relevant slots. This is the core "feedback loop" moment that makes the Balatro-style score escalation feel real.

**Fix:**
Pass `lastScore.runeEffects` (or a derived `triggeredRuneIds` array) as a prop to `RuneBar`. When a `runeInstanceId` matches a triggered effect, apply a brief animation class to that slot:
```tsx
// RuneBar.tsx
interface RuneBarProps {
  runes: RuneCard[];
  maxSlots: number;
  triggeredIds?: string[]; // new
}
// On matching slot: add 'motion-safe:animate-neo-pop ring-2 ring-neo-lime' for 400ms
```

---

### LOW-3 — Content — Rune inspection popup shows description key name, not rune name translated

**File:** `RuneBar.tsx:51`
**Category:** i18n

**Issue:**
`runes[inspecting].def.name` is displayed as a heading in the inspect popup. If `name` is a plain English string (not a translation key), it will not localize. Confirm whether `RuneCardDef.name` is intended to be a translation key (`wordForge.rune.vowelMiner.name`) or a direct string. If it is a key, apply `t()`. If it is a direct string, document this decision explicitly in the type.

---

### LOW-4 — Game Feel — BossReveal "READY" button triggers immediately on tap

**File:** `BossReveal.tsx:50-59`
**Category:** Interaction Design

**Issue:**
The READY button immediately calls `onReady` which starts the round and the countdown timer. There is no brief delay, confirmation, or transition animation between tapping READY and the grid appearing. Players who tap READY while still reading the constraint description will find the timer already counting down before they have processed the information. The design spec asks "Should there be a countdown?" — the answer is yes, at minimum a 1-second delay.

**Fix:**
Add a brief disable window:
```tsx
const [isTransitioning, setIsTransitioning] = useState(false);
const handleReady = () => {
  setIsTransitioning(true);
  setTimeout(onReady, 600); // allow brief fade-out
};
```
Or display a "3... 2... 1..." countdown overlay after READY is pressed before the grid appears.

---

### LOW-5 — Design Consistency — Background is hardcoded `#0A0A1A` across all screens

**Files:** All 8 components
**Category:** Design System / Tokens

**Issue:**
Every component uses the hardcoded hex `#0A0A1A` as the background color. This is the "Neon Forge" sub-theme color defined in the design spec. However, it is not in the design system's CSS variables or Tailwind config — it only exists as a raw hex in source files. If this color needs to change or the design system evolves, every file must be updated manually.

**Fix:**
Add a CSS variable to the design system:
```css
/* globals.css — inside :root */
--word-forge-bg: #0A0A1A;
```
And a Tailwind token:
```js
// tailwind.config.js
'forge-bg': 'var(--word-forge-bg)',
```
Then replace `bg-[#0A0A1A]` with `bg-forge-bg` across all Word Forge components.

---

### LOW-6 — Accessibility — Grid tile accessibility labels missing

**File:** `WordForgeGrid.tsx:143-159`
**Category:** Accessibility / Screen Reader

**Issue:**
Grid tiles are `<div>` elements with mouse and touch event handlers but no `role`, `aria-label`, or `tabIndex`. Screen readers cannot navigate or interact with the grid. While a fully accessible swipe-to-spell interaction is complex, a minimum viable approach labels each tile and groups the grid region.

**Fix:**
```tsx
// WordForgeGrid.tsx — grid container
<div
  ref={gridRef}
  role="grid"
  aria-label={t('wordForge.letterGrid')}
  ...
>

// Individual tile
<div
  key={`${ri}-${ci}`}
  role="gridcell"
  aria-label={`${letter}, ${t('wordForge.row')} ${ri + 1}, ${t('wordForge.column')} ${ci + 1}${inPath ? ', ' + t('wordForge.selected') : ''}`}
  aria-selected={inPath}
  ...
>
```

---

## Summary of Recommended Implementation Order

### Sprint 1 — Ship blockers (CRIT + safety)
1. CRIT-1: Fix `t()` wrapping on all description keys and rarity labels
2. CRIT-2: Add safe area insets to HUD and RuneBar
3. CRIT-3: Fix RunePicker overflow on 320px viewports
4. HIGH-4: Add `aria-live` regions to timer, word preview, score feedback

### Sprint 2 — Game feel and spec gaps (HIGH)
5. HIGH-1: Wire invalid word shake feedback
6. HIGH-2: Add target score + tip to BossReveal
7. HIGH-3: Add XP / progression section to RunSummary
8. HIGH-5: Apply `motion-safe:` to all animation classes
9. HIGH-6: Migrate buttons to shared Button component
10. HIGH-7: Add boss round visual state to HUD

### Sprint 3 — Polish and depth (MED + LOW)
11. MED-1: Fix ScoreFeedback absolute positioning conflict
12. MED-4: Add timer urgency ramp
13. MED-7: Add replace rune confirmation step
14. LOW-2: Wire rune trigger animations from ScoreFeedback to RuneBar
15. LOW-4: Add READY button transition delay
16. LOW-5: Extract `#0A0A1A` to a design token

### Deferred (valid but lower urgency)
- MED-5: Tutorial / onboarding (first 3 runs)
- MED-6: Found words history list
- MED-8: Dictionary loading state
- LOW-1: RTL shadow audit
- LOW-3: Rune name translation audit
- LOW-6: Grid tile ARIA roles
