# Adventure Mode UI/UX Clutter Audit
**Date:** 2026-05-01  
**Scope:** UI surfaces only (read-only audit)  
**Lens:** Information density, hierarchy, redundancy, modal stacking, decision overload

---

## Executive Summary

Adventure mode suffers from **progressive UI bloat** across three layers: (1) hub features competing for attention, (2) simultaneous in-game overlays (HUD + toasts + modals) fighting for screen real estate, (3) modal stacking during boss transitions. **Mobile portrait is severely affected** — objectives + upgrade HUD + combo overlays + flash challenge toasts create visual chaos on phones. RTL (Hebrew) amplifies some shadow/layout glitches. **Highest-impact fix:** defer secondary quest details to a dismissible panel; keep hub hero-focused.

---

## Clutter Findings (20 items)

### HUB LAYER (4 findings)

#### P1-HUB-01: Quest Duplication & Cognitive Load
**Surface:** `AdventureHub.tsx` lines 184–331  
**Problem:**  
- Daily quests shown **3 times** simultaneously:
  1. Compact progress dots + label (line 221–252)
  2. Full quest detail rows (lines 283–330)
  3. Weekly modifiers as separate section (lines 255–274)
- Mobile: only 48px viewport after hero + overlap with ghost rival widget
- Each quest row = 44px; 3 quests = 132px scrollable area just for quests
- Completion banner (line 320) adds redundancy: already signaled by all-green progress bars

**Simplification:**
- **Remove** the full detail rows (lines 283–330).
- Keep **only** the compact progress bar row (lines 221–252) on hub.
- Move detailed quest text to a **dismissible info panel** (icon tap → modal).
- Reduces hub scrollable area by ~180px (mobile first).

**Before/After:**
```
BEFORE (mobile portrait):
┌─────────────────────┐
│ Hero image (120px)  │
├─────────────────────┤
│ Streak badge (40px) │
├─────────────────────┤
│ Daily quest dots +  │
│ progress bar (50px) │
├─────────────────────┤
│ Weekly modifiers    │
│ pills (30px)        │
├─────────────────────┤
│ Quest detail rows   │
│ (132px for 3)       │
├─────────────────────┤
│ Ghost rival (80px)  │
├─────────────────────┤
│ Spacer + CTAs       │
└─────────────────────┘

AFTER:
┌─────────────────────┐
│ Hero image (120px)  │
├─────────────────────┤
│ Streak + quests in  │
│ ONE row (50px)      │
│ [?] info icon       │
├─────────────────────┤
│ Ghost rival (80px)  │
├─────────────────────┤
│ More breathing room │
│ CTAs more visible   │
└─────────────────────┘
```
**Tags:** mobile, information-density  
**File:** `fe-next/components/adventure/AdventureHub.tsx:283–330`

---

#### P2-HUB-02: Weekly Modifiers as Separate Section
**Surface:** `AdventureHub.tsx` lines 255–274  
**Problem:**
- Modifier pills (purple) are informational but not actionable on hub.
- Displayed as a separate visual row that breaks scan flow.
- On mobile: takes 24px height for passive UI.
- Mechanic breakdown happens **in-game** (MechanicIndicator), so hub modifier preview is redundant.

**Simplification:**
- **Move to a tooltip** on the streak badge or a mini-menu.
- Or **defer to gameworld banner** above objectives.
- Removes ~30px clutter and visual break.

**Tags:** mobile, redundancy  
**File:** `fe-next/components/adventure/AdventureHub.tsx:255–274`

---

#### P1-HUB-03: Ascension Badge Compression
**Surface:** `AdventureHub.tsx` lines 158–163  
**Problem:**
- Ascension badge lives inline with "Level {playerLevel}" in hero overlay.
- At 10px font + crown icon + 2px border, it's a tight visual fit on mobile.
- Shifts level text right; asymmetric spacing on RTL.

**Simplification:**
- **Move ascension to a separate small badge** (e.g., bottom-right of hero image).
- Or **show only icon** (crown) as a small glyph; full label on long-press/hover.
- Clears horizontal space in hero stats overlay.

**Tags:** mobile, RTL, information-density  
**File:** `fe-next/components/adventure/AdventureHub.tsx:158–163`

---

#### P2-HUB-04: Secondary Action Row Proliferation
**Surface:** `AdventureHub.tsx` lines 377–437  
**Problem:**
- **Two separate rows** of buttons:
  1. World Map + Endless + Boss Rush (lines 377–437)
  2. Shop + Word Album (lines 440–470)
- Each row is conditional: Endless unlocks at W3, Boss Rush at certain progression.
- On mobile: buttons wrap awkwardly; unclear hierarchy.
- Tertiary actions (Shop, Word Album) sit below secondary (World Map).

**Simplification:**
- **Consolidate to a single FAB menu** (e.g., "More" icon) or **bottom action sheet**.
- Keep "Continue" and "World Map" as primary CTAs only.
- Other actions (Shop, Endless, Boss Rush, Achievements, Collection) go into a menu.
- Reduces visual noise and improves CTA hierarchy.

**Tags:** mobile, decision-overload  
**File:** `fe-next/components/adventure/AdventureHub.tsx:377–470`

---

### IN-GAME HUD/OVERLAY LAYER (9 findings)

#### P0-GAME-05: Simultaneous Toast Stacking
**Surface:** `AdventureTailOverlays.tsx` lines 77–123 + individual toast components  
**Problem:**
- **5 overlays can appear simultaneously on top of each other:**
  1. `LowHPOverlay` (hunt mode, vignette)
  2. `AdventureToast` (upgrade triggers, themed word bonus)
  3. `MechanicBonusToast` (e.g., "Ice Breaker activated +30%")
  4. `FlashChallengeToast` (bottom-right, compact but overlaps gameplay)
  5. `ComboMilestoneOverlay` (full-screen text "INCREDIBLE!")
- On mobile portrait (320px width), toasts collide in center/top area.
- Player's view is **fragmented** between objectives (left), toasts (center), grid (right).
- **Each toast has different auto-dismiss logic** (1.5s–2.5s), creating temporal clutter.

**Simplification:**
- **Merge AdventureToast + MechanicBonusToast** into a single notification queue.
- Use **single stacking toast container** with max 2 visible at once (older ones auto-hide or collapse).
- Move FlashChallengeToast to **bottom-right corner only** (not overlapping central grid).
- ComboMilestoneOverlay **only appears in celebration window**, never with active objectives.
- Queue pending toasts and dequeue by type priority (combo > mechanic > upgrade).

**Before/After:**
```
BEFORE (mobile during active gameplay):
┌─────────────────┐
│ ▲ "Themed +2x" (AdventureToast)
│                 │
│ ▲ "Ice Break +30%" (MechanicBonusToast, top-48)
│                 │
│ ▼ "Flash challenge 5s" (FlashChallengeToast, bottom-22)
│                 │
│ OBJECTIVES on left, GRID center, all compressed
└─────────────────┘

AFTER:
┌─────────────────┐
│ Compact queue:  │
│ 1️⃣ "Ice Break +30%"  (dismiss 1.8s auto)
│ 2️⃣ "Themed +2x" (queued, shows after #1)
│                 │
│ ✓ Flash challenge in fixed bottom-right corner
│                 │
│ OBJECTIVES left, GRID center, clean sight lines
└─────────────────┘
```
**Tags:** mobile, information-density, modal-stacking  
**Files:**
- `fe-next/components/adventure/AdventureTailOverlays.tsx:77–123`
- `fe-next/components/adventure/AdventureToast.tsx`
- `fe-next/components/adventure/MechanicBonusToast.tsx`
- `fe-next/components/adventure/FlashChallengeToast.tsx`

---

#### P1-GAME-06: Objectives Always Visible on Mobile
**Surface:** `AdventureObjectives.tsx` entire component (300+ lines) + AdventureViewHeader  
**Problem:**
- Objectives list is **fixed left-side HUD** that takes 120–180px width on mobile.
- On narrow phones (320px), leaves only 140px for gameplay grid.
- Grid cards are already small (60px); with objectives, **gameplay is squeezed**.
- Objectives **re-animate on every level entry** (slide-in), adding motion clutter.
- Primary vs secondary objective visual distinction (different borders/backgrounds) adds cognitive load.

**Simplification:**
- On **mobile only**: make objectives a **collapsible/toggle panel** (icon tap → slide-out drawer or modal).
- Show **only active primary objective** (1 line) in header bar during gameplay.
- Defer detailed objective list to pause menu or a dedicated modal.
- Removes 140px+ width clutter on phones.
- Desktop (lg) keeps objectives visible (justified screen space).

**Tags:** mobile, information-density, animation-overload  
**File:** `fe-next/components/adventure/AdventureObjectives.tsx`

---

#### P1-GAME-07: AdventureViewHeader Over-Packed
**Surface:** `AdventureViewHeader.tsx` lines 38–82  
**Problem:**
- Header contains: back button + breadcrumb + star count + level badge + music controls.
- On mobile: everything squeezed into 56px header.
- Star count + level are also shown in hero image on hub; redundant on sub-pages.
- Music controls (rarely used mid-game) occupy prime header space.

**Simplification:**
- **Remove star count + level from header** during gameplay (already in level-complete modal + hub).
- **Move music controls to pause menu** (not header).
- Keep only: back button + minimal breadcrumb.
- Reclaim ~40% header width for breathing room.

**Tags:** mobile, redundancy  
**File:** `fe-next/components/adventure/AdventureViewHeader.tsx`

---

#### P0-GAME-08: Objectives + Upgrade HUD Collision on Mobile
**Surface:** `AdventureObjectives.tsx` + `AdventureUpgradeHUD.tsx` layout coordination  
**Problem:**
- Objectives list left-pinned.
- Upgrade HUD (showing equipped power-ups) typically right-pinned or inline.
- On mobile portrait, **both fight for edges** of a 320px screen.
- Player must **look at 4 corners** of screen during active gameplay (objectives left, grid center, upgrades right, toasts top).
- Creates a "Swiss army knife" UI with no focal point.

**Simplification:**
- **Consolidate left-side HUD**: objectives + upgrades in a single collapsible sidebar.
- Or **bottom-up approach**: move both to a bottom action bar (mobile-style tab UI).
- Keep gameplay grid as **dominant focal point** (center, 60–80% of screen).
- Defer stat details to pause overlay.

**Tags:** mobile, information-density, layout-conflict  
**Files:**
- `fe-next/components/adventure/AdventureObjectives.tsx`
- `fe-next/components/adventure/AdventureUpgradeHUD.tsx`

---

#### P1-GAME-09: MechanicIndicator Redundancy
**Surface:** `MechanicIndicator.tsx` lines 19–64  
**Problem:**
- Shows mechanic name + "description truncate" + hit count.
- Appears inline with objectives or in HUD.
- Mechanic is **also shown on level entry** (LevelEntryOverlay) + in game-over modal.
- Hit count animation (`scale 1.4 → 1`) fires every trigger; cumulative visual noise.

**Simplification:**
- **Show mechanic indicator only on first trigger** of the level, not persistent.
- Or **move to top-right corner badge** (compact: icon + name only, no description).
- Remove hit-count animation; show counter as passive text (no spring).
- Reduces duplicate mechanic communication.

**Tags:** mobile, redundancy, animation-overload  
**File:** `fe-next/components/adventure/MechanicIndicator.tsx:19–64`

---

#### P2-GAME-10: HintMessage Layering
**Surface:** `HintMessage.tsx` lines 42–51  
**Problem:**
- Hint appears as a full-width box during adaptive difficulty prompts.
- Yellow border + neo-navy background makes it visually heavy.
- Positioned mid-screen, overlaps objectives or objectives explanation.
- Takes 40px height for a single line of text.

**Simplification:**
- **Collapse to a toast** (top-center, auto-dismiss 3s).
- Or **show only once per session** (reduced-motion compliant).
- Use smaller font + reduced padding (20px height instead of 40px).

**Tags:** mobile, information-density  
**File:** `fe-next/components/adventure/HintMessage.tsx:42–51`

---

#### P1-GAME-11: ComboMilestoneOverlay as Full-Screen Interrupt
**Surface:** `ComboMilestoneOverlay.tsx` lines 83–120  
**Problem:**
- Full-screen overlay with giant text (6xl–9xl) for combo milestones.
- Blocks gameplay for **~1.5s** (BURST_DURATION + HOLD_DURATION + FADE).
- Combines with FlashChallenge + Mechanic toasts on same frame → player loses orientation.
- Particularly jarring on mobile where 1.5s is a long time mid-game.

**Simplification:**
- **Reduce to a corner badge** (top-right) instead of full-screen.
- Or **defer full celebration** to level-complete modal (where player expects it).
- If full-screen needed, **dequeue all other toasts** during animation.
- Reduce duration to 800ms (still satisfying, less disruptive).

**Tags:** mobile, animation-overload, modal-stacking  
**File:** `fe-next/components/adventure/ComboMilestoneOverlay.tsx:83–120`

---

#### P1-GAME-12: LowHPOverlay Vignette Ambiguity
**Surface:** `AdventureTailOverlays.tsx:79` + `LowHPOverlay` call  
**Problem:**
- Hunt mode: when HP is low, a radial vignette overlay appears (pink transparency).
- Works as a **warning signal**, but adds **visual noise to already-busy screen**.
- No clear visual focus; player unsure if it's a hint, a warning, or just atmosphere.
- On slow phones, rendering another full-screen overlay impact perf.

**Simplification:**
- **Replace vignette with a subtle icon** (heart icon top-left, pulsing red).
- Or **add a small "Low HP!" toast** instead of vignette.
- Keeps warning signal without full-screen effect.

**Tags:** mobile, performance, clarity  
**File:** `fe-next/components/adventure/AdventureTailOverlays.tsx:79`

---

#### P0-GAME-13: Blast Mode "Last Move" Vignette Pulse
**Surface:** `AdventureTailOverlays.tsx` lines 80–88  
**Problem:**
- When movesRemaining === 1, a radial-gradient vignette pulses over entire screen.
- Creates **strobing visual effect** that adds urgency but also **clutter**.
- Combined with other overlays (objectives, toasts), screen becomes chaotic.
- Accessibility: flashing/pulsing can trigger vestibular issues.

**Simplification:**
- **Replace pulsing vignette** with a **subtle countdown timer** (just a number in corner: "1 move left").
- Or **subtle border glow** (not full-screen radial gradient).
- Maintains urgency without visual noise.
- Test with `prefers-reduced-motion`.

**Tags:** mobile, animation-overload, accessibility  
**File:** `fe-next/components/adventure/AdventureTailOverlays.tsx:80–88`

---

### MODAL STACKING LAYER (4 findings)

#### P0-MODAL-14: Level Complete Modal + Retry Assist Modal Collision
**Surface:** `LevelCompleteModal.tsx` + `RetryAssistModal.tsx`  
**Problem:**
- Player loses a level → RetryAssistModal slides in (with retry options).
- If player dismisses to hub, then re-enters same level → LevelCompleteModal from **prior attempt** may be in render tree.
- On fast navigation, **both modals can render simultaneously** (z-index war).
- Each modal has its own scroll area (scrollable content box inside).
- Mobile: modal is `max-w-md`, leaving only 40px padding on 320px screen; content is cramped.

**Simplification:**
- **Single modal state machine**: `NONE | COMPLETE | FAILED | RETRY_ASSIST`.
- Never allow both modals in render tree.
- Ensure **clear exit path**: click outside or close button dismisses all related modals.
- Test modal lifecycle on rapid re-entry.

**Tags:** mobile, modal-stacking  
**Files:**
- `fe-next/components/adventure/LevelCompleteModal.tsx`
- `fe-next/components/adventure/RetryAssistModal.tsx`

---

#### P1-MODAL-15: Boss Battle Modal Stacking
**Surface:** `BossIntro.tsx` + `BossHPBar.tsx` + `BossDialogue.tsx` + `BossVictory.tsx`  
**Problem:**
- Boss intro (full-screen modal) → gameplay with HP bar + dialogue (overlays) → boss victory modal.
- Each layer has its own animation + auto-dismiss logic.
- Dialogue can stack on top of HP bar if timings collide.
- Player unsure which modal to interact with.

**Simplification:**
- **Single boss modal state**: INTRO → BATTLE_HUD (HP bar + dialogue) → VICTORY.
- HP bar + dialogue are **not separate modals**, just layered views within BATTLE_HUD.
- Victory modal only appears **after battle ends**, never alongside gameplay.
- Use `z-index` tiers: base (0) < objectives (10) < boss HUD (20) < victory (30).

**Tags:** information-density, modal-stacking  
**Files:**
- `fe-next/components/adventure/BossIntro.tsx`
- `fe-next/components/adventure/BossHPBar.tsx`
- `fe-next/components/adventure/BossDialogue.tsx`
- `fe-next/components/adventure/BossVictory.tsx`

---

#### P1-MODAL-16: Loot Chest + Level Complete Double Celebration
**Surface:** `LootChestReveal.tsx` + `LevelCompleteModal.tsx`  
**Problem:**
- When level complete with loot drops: LevelCompleteModal shows stars + rewards.
- Then separately, LootChestReveal (another modal) appears for visual treasure reveal.
- Two full-screen modals in sequence with **separate animations + dismiss flows**.
- Player taps through 2 "continue" buttons to finish a single level.

**Simplification:**
- **Merge loot reveal into LevelCompleteModal** as an animated section.
- Single modal, single dismiss flow.
- Example: stars section → swipe/tap → chest opens → loot items appear → single "continue" CTA.
- Reduces modal count and decision fatigue.

**Tags:** modal-stacking, decision-overload  
**Files:**
- `fe-next/components/adventure/LootChestReveal.tsx`
- `fe-next/components/adventure/LevelCompleteModal.tsx`

---

#### P1-MODAL-17: AdventureViewModals Stacking Conditions
**Surface:** `AdventureViewModals.tsx` lines 39–180  
**Problem:**
- 5+ independent modal visibility states: shop, word album, weekly challenge, collection, achievements.
- No mutual exclusion; technically all could render if props enable it.
- Each modal is `z-50` with backdrop blur; overlapping backdrops create visual ghosting.
- Mobile: modal max-width `max-w-lg` (32rem) on a 320px screen = nearly full screen, but with dead-space padding.

**Simplification:**
- **Single modal queue**: only one modal (shop | word-album | achievements | etc.) visible at once.
- Or **single modal slot** with conditional content.
- Add guard: if `showShop && showAchievements`, prioritize shop; close achievements.
- Tighten mobile max-width to `w-11/12` or `max-w-sm` for better proportions.

**Tags:** mobile, modal-stacking  
**File:** `fe-next/components/adventure/AdventureViewModals.tsx:39–180`

---

## RTL (Hebrew) Specific Issues

#### P1-RTL-18: AdventureHub Ascension Badge Layout
**Surface:** `AdventureHub.tsx` lines 158–163  
**Problem:**
- Ascension badge (crown icon + "Ascension 1") placed inline with "Level X".
- On RTL: badge right-aligns, but icon/text order doesn't flip; visually jarring.
- Hard shadows: `2px 2px 0px` should be `-2px 2px 0px` on RTL (handled by Tailwind in most cases, but verify).

**Simplification:**
- Use Tailwind `rtl:` variant for icon+text order: `flex-row-reverse` on RTL.
- Verify `shadow-hard` flip applied (check `cn()` calls).

**Tags:** RTL, layout  
**File:** `fe-next/components/adventure/AdventureHub.tsx:158–163`

---

#### P1-RTL-19: Objectives Slide-In Direction
**Surface:** `AdventureObjectives.tsx` lines 125–134  
**Problem:**
- Slide-in animation: `x: isRTL ? -50 : 50` (lines 126–128).
- Works, but combined with **multiple objectives animating staggered** (line 170), RTL screens have **asymmetric visual flow**.
- On LTR: left-to-right swipe is natural; on RTL, right-to-left is expected.
- Current code does this, but **duration + stagger** make it feel uneven on RTL.

**Simplification:**
- Reduce stagger on RTL (use `isRTL ? staggerMs * 0.8 : staggerMs`).
- Or **defer slide-in on mobile** (just fade in, no translate).

**Tags:** RTL, animation  
**File:** `fe-next/components/adventure/AdventureObjectives.tsx:125–134`

---

## Performance + Accessibility Secondary Issues

#### P2-PERF-20: Confetti Particle Budget on Mobile
**Surface:** `LevelCompleteModal.tsx` lines 141–147  
**Problem:**
- `fireVictoryConfetti()` checks `particleBudget.combo > 0`, but still fires full confetti burst on every level completion.
- Combined with modal animations + blur backdrop, can cause jank on low-end Android.
- RTL: confetti physics may not be mirrored.

**Simplification:**
- Cap confetti particle count to **50 max on mobile** (check via `useDevicePerformance`).
- Defer confetti to 200ms after modal appears (let animations settle).
- Add `prefers-reduced-motion` gate.

**Tags:** mobile, performance, accessibility  
**File:** `fe-next/components/adventure/LevelCompleteModal.tsx:141–147`

---

## Recommendations by Priority

### Top 5 P0 Clutter Targets

1. **P0-GAME-05: Toast Stacking** — Merge AdventureToast + MechanicBonusToast into single queue; max 2 visible. **Impact: Saves 60px screen height on mobile.**
2. **P0-MODAL-14: Modal Collision** — Implement modal state machine; ensure COMPLETE and FAILED modals never render simultaneously. **Impact: Eliminates z-index confusion, clearer UX.**
3. **P0-GAME-08: Objectives + Upgrade HUD Collision** — Consolidate into one sidebar or bottom bar; gameplay grid becomes dominant focal point. **Impact: Frees 140px width on 320px mobile screen.**
4. **P0-GAME-13: Blast Mode Vignette** — Replace pulsing radial-gradient with corner timer badge. **Impact: Removes full-screen strobing; improves accessibility.**
5. **P1-HUB-01: Quest Duplication** — Remove full detail rows from hub; defer to dismissible modal. Keep only compact progress bar. **Impact: Reduces hub scroll depth by ~180px.**

### Single Highest-Impact Simplification

**MERGE HUB QUEST DETAILS + MODAL STACKING FIX**

Current state: 3 quest display patterns (dots + bar, detail rows, completion banner) competing for hub space → quest detail modal opened separately. In-game: simultaneous toasts/overlays overlap. 

**Proposed single unified fix:**
- **Hub:** Keep only compact progress row + [?] icon to open quest detail modal (saves ~180px).
- **In-game:** Single toast queue (max 2 visible, auto-dequeue by priority) replaces scattered AdventureToast + MechanicBonusToast + FlashChallenge toasts (saves ~100px mid-game).
- **Overall:** Gameplay grid gains **~40% more screen real estate on mobile** (320px → ~140px freed across hub + gameplay).

This alone would transform mobile experience from "Swiss army knife scattered UI" to "clear focal point + contextual details."

---

## Implementation Notes

### Phase 1: Non-Breaking (Low Risk)
- Remove redundant weekly modifiers from hub (move to tooltip).
- Collapse ComboMilestoneOverlay duration (800ms).
- Add music controls to pause menu (remove from header).

### Phase 2: Moderate Risk (Requires Coordination)
- Implement modal state machine (NONE | COMPLETE | FAILED | RETRY_ASSIST).
- Merge AdventureToast + MechanicBonusToast into single queue.
- Move HintMessage to toast (defer to notifications system).

### Phase 3: High Impact (Major Refactor)
- Consolidate objectives + upgrades HUD (sidebar or bottom bar).
- Remove full detail rows from hub; add quest modal.
- Refactor boss modal layers (intro → battle HUD → victory as single state machine).

### Accessibility Checkpoints
- Ensure all toast dequeuing is **keyboard-navigable** (tab to dismiss buttons).
- Test `prefers-reduced-motion` on **all collapsing/stacking overlays**.
- RTL: verify shadow flip + animation direction on Hebrew playthrough.

---

## File References

**Hub files:**
- `fe-next/components/adventure/AdventureHub.tsx` — quest duplication, secondary actions
- `fe-next/components/adventure/HubWelcomeBanner.tsx`
- `fe-next/components/adventure/LevelGrid*.tsx`

**In-game files:**
- `fe-next/components/adventure/AdventureTailOverlays.tsx` — overlay coordination
- `fe-next/components/adventure/AdventureToast.tsx` — upgrade toast
- `fe-next/components/adventure/MechanicBonusToast.tsx` — mechanic bonus
- `fe-next/components/adventure/FlashChallengeToast.tsx` — challenge toast
- `fe-next/components/adventure/ComboMilestoneOverlay.tsx` — combo celebration
- `fe-next/components/adventure/AdventureViewHeader.tsx` — header over-packing
- `fe-next/components/adventure/AdventureObjectives.tsx` — always-visible objectives
- `fe-next/components/adventure/MechanicIndicator.tsx` — mechanic redundancy
- `fe-next/components/adventure/HintMessage.tsx` — hint layering
- `fe-next/components/adventure/AdventureUpgradeHUD.tsx` — HUD collision

**Modal files:**
- `fe-next/components/adventure/AdventureViewModals.tsx` — modal stacking
- `fe-next/components/adventure/LevelCompleteModal.tsx` — modal collision
- `fe-next/components/adventure/RetryAssistModal.tsx` — retry modal
- `fe-next/components/adventure/BossIntro.tsx` — boss intro
- `fe-next/components/adventure/BossHPBar.tsx` — boss HUD
- `fe-next/components/adventure/BossDialogue.tsx` — boss dialogue
- `fe-next/components/adventure/BossVictory.tsx` — boss victory
- `fe-next/components/adventure/LootChestReveal.tsx` — loot modal
- `fe-next/components/adventure/CollectionPanel.tsx` — collection modal

**Sub-routes:**
- `fe-next/app/[locale]/adventure/boss-rush/**`
- `fe-next/app/[locale]/adventure/endless/**`
- `fe-next/app/[locale]/adventure/achievements/**`
- `fe-next/app/[locale]/adventure/skills/**`

---

## Conclusion

Adventure mode has strong **visual identity and feature depth** (quests, upgrades, bosses, loot), but suffers from **progressive UI bloat** that compounds on small screens. The core issue is **information competing for limited mobile real estate** without clear visual hierarchy. Fixing P0 items (toast merging, modal state machine, objectives consolidation) would immediately improve clarity. The brand's "coherent chaos" principle is being undermined by actual chaos; simplifying and deferring secondary info to modals restores **intentional visual energy** vs. accidental clutter.
