# Tutorial Consolidation — Design Spec

## Problem

LexiClash has two competing "how to play" UI patterns living side by side:

1. **ModeCoach** (`fe-next/components/tutorial/ModeCoach.tsx`) — the canonical, non-blocking overlay that plays over the live board during the `'playing'` phase. Wired for 11 modes (classic, wordHunt, wheelRush, blast, wordTower, connections, wordCraft, crossword, sealedBid, shiritori, adventure).
2. **Mode-specific full-screen blocking modals** written before ModeCoach existed, still firing in the `'pre-game'`/`'ready'` phase for 3 of those same modes: `DailyChallengeTutorial` (wordHunt), `PreGameTutorial` (classic), `AdventureTutorial` (adventure).

They're phase-gated so they never render simultaneously (confirmed by audit — not a stacking bug), but each of those 3 modes still gives the player **two separate "how to play" touches, in two different UI languages** (one full-screen block before they've even seen the board, one gentle overlay once they're playing). The 2026-06-19 mode-coach spec explicitly flagged Adventure's migration as unfinished and deferred Daily/Blast "don't rip out working systems." That deferral is the actual duplication debt.

## Decision

One tutorial delivery mechanism per mode: ModeCoach's non-blocking overlay. Remove blocking pre-game modals where they're pure mechanics-teaching duplicates of what ModeCoach already covers (enriching ModeCoach's content where the modal taught something ModeCoach doesn't yet). Do not touch components that aren't actually "how to play" duplicates — progression-gated mechanic reveals, app-level onboarding, spectator UI, contextual hints.

## Per-mode disposition

| Mode | Legacy component | Action |
|---|---|---|
| **wordHunt** (Daily) | `DailyChallengeTutorial.tsx` | Delete. It's pure tutorial content (tile color legend, free-bonus-word mechanic, "same puzzle worldwide" note), no CTAs mixed in — clean removal. Fold the tile-legend + free-bonus explanation into `modeCoachContent.ts`'s `wordHunt` entry as an added step so that teaching isn't lost. Remove its render site in `DailyChallenge.tsx` and the `lexiclash-wordhunt-ftue-seen` storage key. |
| **classic** (Singleplayer) | `PreGameTutorial.tsx` | Trim, don't delete. Steps 0 (mascot welcome) and 1 (3×3 practice-grid demo) duplicate ModeCoach's classic drag/longWord overlay — remove them. Step 2 (tips shortcut + avatar-builder CTA + boost button + "Let's Play" start action) is the actual pre-game gate/start screen, not tutorial content — keep it as the sole pre-game screen. |
| **adventure** | `AdventureTutorial.tsx` | Delete — completes the migration the 2026-06-19 spec deferred. Mount `ModeCoach mode="adventure"` in the adventure game screen (content already defined in `modeCoachContent.ts`, just never wired). Compare its 2 emoji steps against AdventureTutorial's 3 i18n-keyed steps and add a 3rd step if a concept (movement/targeting/combat) is missing. |
| **blast** | `useBlastTutorial` unlock/concept cards | No change. Progression-gated per-mechanic reveal tied to level unlocks, not a generic how-to-play repeat. Confirmed intentional in the 2026-06-19 spec ("don't rip out working systems"). |
| Boss mechanics (adventure) | `BossMechanicTutorial.tsx` | No change. Teaches newly-unlocked boss twists mid-run — different content and timing than the base "how to play," not a duplicate. |
| Practice, TV broadcast, app-level onboarding (TutorialGame/CrazyGames/Invite), lobby panel, gesture coachmarks (`GestureTutorialTooltip`, `MPDragCoachmark`, `LandscapeTutorialOverlay`), in-game hint cards (`PracticeMistakeCoach`, `MPStuckCoachCard`) | various | No change — out of scope. These aren't per-mode "how to play" duplicates: they're app-level first-run FTUE, spectator-screen UI, or contextual hints tied to specific events, not a second explainer of the same mechanics ModeCoach already teaches. |

## Content additions to `modeCoachContent.ts`

- `wordHunt`: add the tile-color-legend teaching and the free-bonus-word mechanic that `DailyChallengeTutorial` covers and the current 2-step entry (tapClue, drag) doesn't.
- `adventure`: cross-check the existing 2 emoji steps against `AdventureTutorial`'s 3 i18n-keyed steps (`adventure.tutorial.step1/2/3` — hand/target/swords); add a step only if a concept is genuinely missing, reusing the existing i18n copy rather than writing new strings.

Exact demo/step shape (whether a new `CoachDemo` animation kind is needed or a caption-only step suffices) is an implementation-plan detail, resolved by reading `CoachDemo.tsx`'s supported kinds before writing code.

## Storage cleanup

Delete `lexiclash-wordhunt-ftue-seen` and the Adventure `hasSeenTutorial()` key along with their owning components. No broader localStorage-namespace unification — that's a separate, unrequested cleanup with its own risk; skip it.

## Testing

TDD per project rules. For each deleted component: delete its test file (if any) in the same change as the component. For `modeCoachContent.ts` additions: extend existing coverage for the changed mode entries. For the new `ModeCoach mode="adventure"` mount: add a render test confirming it fires in the adventure game screen the way it does for other modes (mirror an existing mode's test, e.g. wordHunt's).

## Out of scope

- Storage-key namespace unification.
- Any change to Blast's progression-gated cards, Practice, TV broadcast, app onboarding, lobby, or gesture/coachmark systems.
- Visual/behavioral redesign of ModeCoach itself.
