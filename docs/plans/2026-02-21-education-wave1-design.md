# Education Section Wave 1 — Quick Wins Design

**Date:** 2026-02-21
**Source:** Cross-disciplinary audit by e-learning expert, frontend engineer, teacher expert, language expert
**Approach:** Three-Wave phased enhancement (Wave 1 = quick wins shipping immediately)

---

## Context

A four-specialist audit of the LexiClash education section identified 30+ gaps across pedagogy, UX/UI, teacher workflow, and language acquisition. Wave 1 addresses all items that can ship with low implementation risk and no architectural changes. Each item is independently deployable.

---

## Items

### 1. RTL `dir` attribute — 3 practice components

**Problem:** `FlashcardReview`, `WordMatchingPractice`, and `VocabularyCardEnriched` lack `dir={isRTL ? 'rtl' : 'ltr'}` on their outermost containers. Hebrew text renders incorrectly for long definitions and examples.

**Pattern to match:** `LessonPractice.tsx:138` and `SpellingChallengePractice.tsx:138` already handle this correctly.

**Files:**
- `fe-next/components/practice/FlashcardReview.tsx` — wrap main container
- `fe-next/components/practice/WordMatchingPractice.tsx` — wrap main container + verify sub-containers
- `fe-next/components/practice/VocabularyCardEnriched.tsx` — wrap card root

**Test:** Render with `?locale=he` — text must flow right-to-left, card layout must not break.

---

### 2. Contextual loading states

**Problem:** Four locations use bare `<div>Loading...</div>` or unstyled spinners with no context. Users don't know what's loading or how long to wait.

**Design:** Replace with neo-brutalist loading card: spinner + context sentence. Follow the `PageLoader` component pattern already used elsewhere.

**Files and messages:**
| File | Line | Replacement message |
|------|------|-------------------|
| `ChallengePanel.tsx` | 53 | `"Loading your challenges..."` |
| `ClassroomGameLobby.tsx` | 249 | `"Setting up your classroom..."` |
| `DuelGameView.tsx` | 162 | `"Loading your duel..."` |
| `DuelsPageClient.tsx` | 49 | `"Finding your classmates..."` |

**Component:** Use existing `<PageLoader text="..." size="lg" />` — no new component needed.

---

### 3. `WordContextRow` — part-of-speech + first example in all practice cards

**Problem:** `VocabularyCardEnriched` already has `partOfSpeech` and `examples[]` in the `EnrichedVocabularyWord` type but `FlashcardReview`, `SpellingChallengePractice`, and `WordMatchingPractice` don't surface them. Language expert: contextual learning = 2.5× retention.

**Design:** Extract a small `WordContextRow` sub-component:

```tsx
// components/practice/WordContextRow.tsx
interface WordContextRowProps {
  partOfSpeech?: string;
  example?: string;
}
// Renders: "verb  ·  "She spoke quietly""
// Styled: text-sm text-neo-white/60, italic example
```

**Files:**
- `fe-next/components/practice/WordContextRow.tsx` — new shared sub-component
- `fe-next/components/practice/FlashcardReview.tsx` — add below word on word-side card
- `fe-next/components/practice/SpellingChallengePractice.tsx` — add above scrambled letters
- `fe-next/components/practice/WordMatchingPractice.tsx` — add on each word item

**Graceful degradation:** If `partOfSpeech` or `examples` are absent, render nothing (not all words have enriched data).

---

### 4. Pronunciation button in all practice modes

**Problem:** `PronunciationButton` component exists but is only present in the swipe-mode definition reveal. Students can't hear words in flashcard, spelling, or matching modes.

**Design:** Add `PronunciationButton` next to the word in:
- `FlashcardReview.tsx` — word-side, top-right of card
- `SpellingChallengePractice.tsx` — beside the word display, before scrambled tiles
- `WordMatchingPractice.tsx` — icon button on each word chip (small variant)

**No new component needed.** Import and render existing `PronunciationButton` with the word's `word` prop.

**Graceful degradation:** If no audio available, button hides itself (already handled by `PronunciationButton`).

---

### 5. QR code + read-aloud format for game code sharing

**Problem:** Teacher needs to display game code on a projector and share it simultaneously. Current UI: large monospace text + clipboard copy only. No QR, no verbal format.

**Design:** In `ClassroomGameLobby.tsx` Step 2, below the game code:

1. **QR code** — small (120×120px), generated client-side from game code string. Use `qrcode.react` (lightweight, no backend needed).
2. **Read-aloud format** — split code into individual characters with separator: `A · F · 4 · D · 2`. Displayed in smaller text below QR.

**Package:** `qrcode.react` (already in many Next.js projects; if not installed, add to dependencies).

**No backend changes.** QR generated client-side from the already-generated `gameCode` string.

---

### 6. Quick Start button on teacher dashboard

**Problem:** Launching a game takes 6–10 clicks across 3 screens. In a 5-minute class setup window this is unusable. Teacher expert: biggest daily friction point.

**Design:** Add a "Quick Start" hero card at the top of `teacher/PageClient.tsx`:

```
┌─────────────────────────────────────────┐
│  ⚡ Quick Start                          │
│  [Last classroom name] · [Last lesson]  │
│  3 min · Medium board · Late join ON    │
│                                         │
│  [Start Game]  [Customize →]            │
└─────────────────────────────────────────┘
```

**Data source:** Store last-used `classroomId` and `lessonIds[]` in `localStorage` keyed to `userId`. Restore on next visit. If no prior game, show `"Start your first game →"` link to the full wizard instead.

**Settings defaults:** `timerMinutes: 3, boardSize: 'medium', allowLateJoin: true` — same as current wizard defaults.

**Interaction:** Clicking "Start Game" navigates directly to `ClassroomGameLobby` pre-populated with restored values, skipping Step 1 entirely and jumping to Step 2 (Review & Start). Clicking "Customize →" opens the normal wizard at Step 1.

---

### 7. Duel teaser on education landing

**Problem:** Duels are hidden behind Student Dashboard → Duels tab. New students never discover them. Frontend engineer: feature discoverability is broken.

**Design:** Add a third card to `education/PageClient.tsx` below the Teacher/Student role cards. Use `neo-yellow` accent stripe.

```
Title:       "Challenge a Classmate"
Description: "Race head-to-head in real-time word duels"
Features:    ["Live 1v1 competition", "Earn XP for wins", "Track your duel history"]
Badge:       "Multiplayer"
CTA:         "Find a Duel →"
```

**Routing:** Clicking navigates to `/${language}/education/duels`. If student is not enrolled in a classroom, the duels page already shows a "Join a classroom first" empty state — no extra guard needed here.

**RTL:** Card uses `start`/`end` for badge positioning, matching the existing `RoleCard` component pattern.

---

### 8. Forfeit button styling + Esc key on `DuelChallengeModal`

**Problem A:** `RealTimeDuelGame.tsx:454-460` — forfeit is a plain text underline link, inconsistent with neo-brutalist design system. Users may miss it or treat it as unimportant.

**Design:** Styled button with warning appearance:
```tsx
className="px-4 py-2 text-sm font-bold border-neo border-red-600
           text-red-400 rounded-neo shadow-hard-sm
           hover:bg-red-500/10 transition-colors"
```

**Problem B:** `DuelChallengeModal.tsx` — no Esc key handler. Screen reader / keyboard users cannot dismiss. Accessibility gap.

**Design:** Add `useEffect` with `keydown` listener: `e.key === 'Escape' → onClose()`. Follow the same pattern as `OnboardingModal.tsx` which already handles Esc correctly.

---

## Architecture Notes

- No new routes or API endpoints required for Wave 1
- No database schema changes
- `qrcode.react` is the only new dependency (small, ~8kb)
- `WordContextRow` is the only new component (30–40 lines)
- All changes are additive — no existing behaviour removed

---

## Testing Requirements

Every changed file needs a test update or addition:
- RTL: Render with `language="he"`, assert `dir="rtl"` on container
- Loading states: Render in loading state, assert context text visible
- `WordContextRow`: Render with/without data, assert graceful degradation
- Pronunciation: Assert button renders when audio available
- QR code: Assert QR container renders with game code prop
- Quick Start: Assert localStorage restore, assert skip to Step 2
- Duel teaser: Assert card renders, assert CTA link href
- Forfeit button: Assert role="button", assert Esc handler fires

---

## Definition of Done

- [ ] All 8 items implemented
- [ ] RTL renders correctly at `?locale=he`
- [ ] No bare loading states remain in education section
- [ ] `WordContextRow` appears in all three practice modes
- [ ] Pronunciation button audible in FlashCard, Spelling, Matching modes
- [ ] QR code renders and scans to correct game code
- [ ] Quick Start button visible on teacher dashboard; last classroom/lesson restored
- [ ] Duel teaser card visible on education landing
- [ ] Forfeit is a styled button; Esc closes DuelChallengeModal
- [ ] `npm run lint && npm run test && npm run build` pass
