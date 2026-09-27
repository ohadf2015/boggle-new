# shadcn/ui usage audit — 2026-07-07

Full audit of shadcn/ui + Radix adoption across `fe-next/`. Scope: every modal/sheet/drawer,
every floating menu/tooltip/popover-like pattern, the toast system, the Collapsible/Accordion
family, and dependency freshness. Each finding below is marked **FIXED**, **NO GAP**, or
**DEFERRED** (sized, with a reason) — nothing was migrated without a demonstrated defect
(missing keyboard support, false ARIA semantics, or a bug), per the project's own incident
history of migrations that regressed working code for no functional gain.

## Setup

shadcn/ui is installed and configured correctly: `components.json`, `cn()` in `lib/utils.ts`,
`class-variance-authority` + `tailwind-merge` + `lucide-react`, 13→14 `@radix-ui/*` packages.
All Radix packages were bumped to latest safe minor/patch (tsc + 511 tests green before this
pass). `lucide-react` has a major version available (0.554→1.23) — **DEFERRED**, breaking-change
risk (icon renames), not attempted.

## Dialogs / modals / sheets — FIXED (3), NO GAP (11), FIXED-mislabel (1)

Of ~18 modal/sheet components audited, most already used the shared `components/ui/dialog.tsx`
(shadcn Dialog) correctly: `CreateRoomModal`, `JoinRoomModal`, `AgeGateModal`, `EmailCaptureModal`,
`WordFeedbackModal`, `HostLeftGraceModal`, `SafetyReminderModal`, `OnboardingModal`,
`ProfileCustomizationModal`, `FirstWinSignupModal`, `WordHuntLoginModal` — **NO GAP**.
`MobileDrawer` uses `vaul` (Radix-adjacent, has its own focus-trap/ESC/scroll-lock) — **NO GAP**.
`PracticeTutorialSheet` is a full-page tutorial, not an overlay — **NO GAP**.

Three were fully hand-rolled (`fixed inset-0` + manual state), with confirmed missing
ESC-to-close, focus-trap, and scroll-lock — **FIXED** by converting to Radix Dialog:

- `components/multiplayer/MPGameAbortedModal.tsx` — forced-choice modal (no dismiss action by
  design; `onOpenChange` is a no-op so ESC/outside-click can't bypass the choice).
- `components/achievements/UnifiedAchievementModal.tsx` — auto-dismiss achievement popup; the
  Radix conversion also picks up the shared Dialog's `ModalOpenFlag` (suppresses the native
  AdMob banner while a modal is open) for free.
- `components/training/TrainingAnalysisModal.tsx` — kept on raw `@radix-ui/react-dialog`
  primitives rather than the app's `components/ui/dialog.tsx` wrapper, since that wrapper's
  neo-brutalist chrome (halftone bg, forced border/shadow classes) doesn't fit this component's
  own light/dark-adaptive visual system. Zero visual change, same a11y wins.

One was a false-ARIA-label bug, not a missing-modal-behavior gap — **FIXED** the label, not the
behavior:

- `components/auth/MultiplayerSignupSheet.tsx` — declared `role="dialog" aria-modal="true"` while
  its own doc comment says "does NOT block interaction with results." The defect was the lying
  ARIA, not missing focus-trap. Changed to `role="region"`, dropped `aria-modal`, added a cheap
  Escape-to-dismiss (it already has two visible close affordances).

## Floating menus / popovers — FIXED (1 — highest-value gap), minimal-fix (3), NO GAP (1)

No `@radix-ui/react-dropdown-menu` or `@radix-ui/react-popover` existed before this pass.
Audited every hand-rolled "menu near a trigger" / "floating panel" pattern:

- **`AuthButton` user menu (`AuthButtonDropdownMenu.tsx`) — FIXED, highest-value gap in this
  audit.** Rendered on every authenticated user's every page. Was hand-rolled: manual
  `getBoundingClientRect` + resize/scroll listeners for positioning, manual `mousedown`
  click-outside, zero Escape handling, zero arrow-key navigation. Migrated onto
  `@radix-ui/react-dropdown-menu` (new shared `components/ui/dropdown-menu.tsx` primitive).
  Now gets Escape-to-close-with-focus-return, roving arrow-key nav, and RTL-correct positioning
  from the app's existing ambient `RadixDirectionProvider` — for free, replacing ~40 lines of
  fragile manual math. Verified against real (unmocked) Radix behavior in
  `AuthButtonMenu.a11y.test.tsx` (open, Escape+focus-return, ArrowDown roving nav, outside-click).
  The old `AuthButtonDropdownPosition.test.tsx` (RTL pixel-math regression test) was replaced —
  its bug class is now structurally impossible, not just newly correct, since Radix owns
  positioning via Popper + the ambient direction context, not manual `style.left/right`.
- **`MusicControls`, `PresenceIndicator`, `ConnectionStatusIndicator` — minimal Escape handler
  added, no new primitive.** Per-advisor call: these are a hover/focus/click-triggered volume
  slider and two status tooltips — thin, single-purpose floating UI where wrapping in a full
  Popover primitive would be primitive-add-without-real-consumer-value (all it needs is
  Escape-to-dismiss). Fixed all three with a 3–5 line `onKeyDown` handler each, TDD'd.
  Note: `MusicControls`' fix needed care — an initial version called `buttonRef.current?.focus()`
  on Escape (mimicking modal focus-return convention), which fired a `focus` event that bubbles
  to the same container's `onFocus` handler and **reopened the panel it had just closed** (this
  panel opens via hover *or* focus, unlike a modal). Removed the focus-return; Escape just
  dismisses.
- `HintButton` — already has Escape handling + tab-focusability — **NO GAP**.

## Accordion / Collapsible — NO GAP (code duplication, not an a11y defect)

`components/ui/CollapsibleSection.tsx` (6 consumers, active) and `components/ui/Collapsible.tsx`
(0 consumers, unused refactor) are both hand-rolled but fully WCAG-compliant: real `<button>`,
`aria-expanded`, `aria-controls`, `role="region"` + `aria-labelledby`. No `@radix-ui/react-accordion`
exists, and none is needed on accessibility grounds — the only issue is two components doing the
same job. **NO GAP** for this audit's purpose (a11y); left untouched per "don't inflate scope."

## Toast system — DEFERRED, sized precisely

`react-hot-toast` (not shadcn Toast/Sonner) is used via `NeoToast`/`EnhancedToast` wrappers.
Blast radius: **72 files** import `react-hot-toast` directly, **32 files** import the wrapper,
**~278 call sites**, 1 centralized `<Toaster>` mount. `sonner` (v2.0.7) is already installed and
used in exactly 4 files — a stalled, partial migration from some earlier attempt.
**DEFERRED** — whole-app rewrite risk, no functional defect driving it (unlike the Dialog gaps,
nothing here is broken), requires explicit user greenlight before attempting.

## RadioGroup — DEFERRED, newly discovered, sized

5 files use `role="radiogroup"` without native `<input type="radio">` or arrow-key navigation
(e.g. `components/playerStyle/StylePicker.tsx:126`, plus `ClassroomSetupStep`, `WordCraftSetup`,
`ChallengeInviteDialog`, shiritori solo setup). This is a real WAI-ARIA gap (the `radiogroup` role
contracts to support arrow-key nav between options) but is a **new category**, not part of the
original shadcn-adoption scan, and no `@radix-ui/react-radio-group` exists yet.
**DEFERRED** — flagged for a follow-up pass, not implemented in this one.

## AlertDialog / ConfirmationDialog — NO GAP

`components/ui/alert-dialog.tsx` (shadcn) has healthy adoption: 16 consumers including
game-critical confirm flows (`HostDialogs`, `PlayerInGameView`, admin bulk actions). No
duplicate hand-rolled confirm-dialog pattern found. **NO GAP**.

## What changed (files)

- `components/multiplayer/MPGameAbortedModal.tsx`, `components/achievements/UnifiedAchievementModal.tsx`,
  `components/training/TrainingAnalysisModal.tsx` — Dialog migration.
- `components/auth/MultiplayerSignupSheet.tsx` — ARIA fix + Escape.
- `components/auth/AuthButton.tsx`, `components/auth/AuthButtonDropdownMenu.tsx`,
  `components/ui/dropdown-menu.tsx` (new) — DropdownMenu migration.
- `components/MusicControls.tsx`, `components/PresenceIndicator.tsx`,
  `components/ConnectionStatusIndicator.tsx` — Escape handlers.
- `package.json` — Radix minor/patch bumps + `@radix-ui/react-dropdown-menu` added.
- Test files: one per fixed component (TDD, real-Radix-behavior where the fix is behavioral),
  plus `AuthButtonDropdownPosition.test.tsx` rewritten (its premise no longer applies) and
  `multiplayer-only-gating.test.tsx` updated for the new `AuthButtonDropdownMenu` prop contract.

## Verification

tsc clean, eslint clean on all touched files, `npm run build` green (fresh `BUILD_ID`, no compile
errors) both before and after the `AuthButton` DropdownMenu migration. Full frontend suite:
3055/3060 test files, 29001/29026 tests passed, 0 failures (the 1 reported "error" was an
out-of-memory worker-fork crash in an unrelated pre-existing test, `useBlastEngine.mpGrid.test.ts`
— a known flake pattern in this large suite, not caused by this change).

Live-browser drive-through (dev server + `agent-browser`, real Chrome, not jsdom):
- Homepage boots clean on both `/en` and `/he` (RTL), no console errors, cookie-consent modal and
  full onboarding flow work end to end.
- `MusicControls` — focused the mute button, confirmed the real volume/haptics panel opens
  (2 real `<input type="range">` elements render), pressed real Escape, confirmed the panel
  closes (0 range inputs after) and the trigger button is still intact — the exact regression
  the earlier unit-test debugging session caught (an initial fix called
  `buttonRef.current?.focus()` on Escape, which re-triggered the same panel's `onFocus` handler
  and reopened it; removed before this drive-through).
- Guest-path `AuthButton` (SIGN IN / SIGN UP buttons) renders correctly in both locales — confirms
  the rewritten file has no runtime import/syntax errors reachable from a cold page load.
- The **authenticated** dropdown menu itself (Escape/focus-return/arrow-nav/RTL alignment) was
  **not** re-driven live in this session — local dev Supabase auth needs a real OAuth round-trip
  this sandboxed session can't complete. It is covered by `AuthButtonMenu.a11y.test.tsx`, which
  renders the real (unmocked) `@radix-ui/react-dropdown-menu` primitive rather than a stub — the
  same behavior a live click would exercise, verified in jsdom rather than a real browser. Treat
  a real click-through as the one remaining manual check before merging.
