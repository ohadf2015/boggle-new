# WordCraft Consolidation + PvP-Invite Spec — 2026-05-29

## Problem (the user's goal)
> "why do we have 2 wordcraft modes, keep only the relevant one and generate image
> from it and remove the beta. make sure it also works for player against other
> player with option to invite"

## Why so many modes (investigation answer)
`/word-craft` is **one route fronting four sub-modes**, switched by query param in
`hooks/useWordCraftModeFlag.ts` and routed in `app/[locale]/word-craft/WordCraftClient.tsx`:

| Sub-mode | Trigger | Component | Nature |
|---|---|---|---|
| **Territory** (default) | `/word-craft` | `PageClient` | Board + rack, claim cells, heat meter, **bot opponent + hot-seat 2-player**. The flagship. |
| Cards (Run) | `?mode=cards` | `RunPageClient` | Solo roguelike power-card run. No opponent. |
| Gems (Hunt) | `?mode=gems` | `GemHuntPageClient` | Solo collection. **Carries a BETA badge.** Admin-only on hub. |
| Classic | `?classic=1` | `PageClient` (flag) | Legacy Scrabble-alt, back-compat. |

They accreted as separate experiments. The landing hub
(`components/landing/LandingChallengeCards.tsx`) markets up to **four** WordCraft
cards (`wordCraft`, `wordCraftCards`, `wordCraftPassPlay`, `wordCraftGems`), all
pointing at a **missing image** `/modes/word-craft.png` (404).

Only **Territory** has an opponent concept, so it is the one relevant to
"player vs player". Cards/Gems are solo score-attack — PvP does not map onto them.

## Decisions
1. **Keep only Territory** as the public, marketed WordCraft. Collapse the four
   landing cards into **one** `wordCraft` card. Pass-and-play becomes an in-game
   option, not a separate hub card.
2. **Reversible, not destructive.** Cards/Gems code is *retained* behind direct
   URLs (`?mode=cards`, `?mode=gems`) but **unlisted** from the hub. No code
   deletion — deletion can come later if desired.
3. **Remove the BETA badge** (`GemHuntPageClient.tsx`) and the `wordCraftGems`
   hub card that carried it.
4. **Generate the hero image** → `public/modes/word-craft.png` (fixes the 404 and
   satisfies "generate image from it"). Neo-brutalist: dark navy, hard pixel
   shadows, electric tiles, kawaii energy.
5. **PvP with invite** = two complementary paths on one mode:
   - **Same device:** pass-and-play (`?vs=human`) — already real 2-human play.
   - **Remote invite:** a **seeded-duel link**. "Challenge a friend" encodes
     `{seed, challengerName, challengerScore}` into a shareable URL. The friend
     opens it, plays the *identical* seeded board, and at game-over sees a
     head-to-head W/L vs the challenger. Pure client, no backend, no sockets.

### Rejected PvP alternatives
- **Real-time socket MP**: correct end-state but multi-day, touches core socket
  layer, large blast radius. Out of scope now.
- **`async_board_challenges` table**: stores a boggle `string[][]` letter grid;
  WordCraft is seed+tile-bag. Schema mismatch → seeded-duel link is the exact fit.

## Implementation phases (TDD, commit per phase)
1. **Spec** (this doc).
2. **Consolidate + de-BETA**: trim landing card order + `SP_MODES` + `JA_HIDDEN`
   to a single `wordCraft`; remove the three extra cases & type members; delete
   BETA span. Test: hub renders exactly one wordcraft card.
3. **Hero image**: generate `public/modes/word-craft.png`.
4. **Seeded-duel invite**: pure `lib/word-craft/duel.ts` (encode/decode/compare,
   TDD) → wire "Challenge a friend" + game-over head-to-head; in-game
   "Play vs friend" picker (pass-and-play OR invite link). i18n ×5.

## Acceptance
- Hub shows one WordCraft card with a real image.
- No BETA anywhere in WordCraft surface.
- `/word-craft` default = Territory; `?vs=human` works; an invite link reproduces
  the same board and shows W/L vs the challenger.
- `npm run lint && test && build` green; verified `/en` + `/he`.
