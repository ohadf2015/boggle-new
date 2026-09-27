# Word Tower — Fun & Gamification Portfolio (spec)

**Date:** 2026-05-28 · **Status:** approved (autonomy directive) → implementing
**Inputs:** advisor review + claude-council (Gemini) + MCP council synthesis.

## Goal (product owner, verbatim)
"word tower still needs polish and to really have the fun aspect and be more
gamified, find places for improvements and add more physics, celebration, think
how it can be part of user routine, and maybe more randomness and surprises like
upgrades etc."

## Guiding principle (both reviewers)
"More gamified" = **more juice + LESS clutter**, not more systems. The game already
has ~12 overlapping systems. Concentrate celebration energy at a few high-stakes
moments; sandbox randomness so it never corrupts the canonical record board.

## Hard constraint
The shared leaderboard is **monotonic best-height**. Any height-boosting perk would
inflate/pollute it. → Perks live ONLY inside a **bounded daily run**, segregated from
the endless climb + its board.

---

## Portfolio (ranked, ship in phases)

### Phase 1 — Physics & celebration juice  *(goal: physics, celebration, polish)*
Pure logic + visual. No backend.
- **Clutch-save** (`lib/wordTower/clutchSave.ts`, pure): when the tower lean crosses a
  CRITICAL threshold (|lean| ≥ ~3.2° of the 4° max), the next drop enters a "clutch"
  window. A *perfect* drop on the opposite (correcting) side = CLUTCH SAVE → snap lean
  toward 0, big bass-thud celebration. A miss while critical = topple. Turns the
  near-death into the biggest dopamine beat in the game.
- **Topple debris**: on hazard/topple, falling blocks tumble (lightweight gravity sim in
  Pixi) instead of instant despawn. Screen shake on impact.
- **SUBTRACT clutter**: achievement unlocks no longer interrupt the climb with a toast —
  they queue into a **post-topple summary** card (floors, longest word, perfect streak,
  rivals passed, NEW achievements). One celebration moment, not N interruptions.

### Phase 2 — Daily Tower mode (Layer A, client-only)  *(goal: user routine)*
- `lib/wordTower/dailySeed.ts` (pure): `dailyTowerGameCode(date)` → `daily-YYYY-MM-DD`
  (UTC); fixed `playerId: 'daily'` so everyone gets the same tray/anchor sequence.
- `lib/wordTower/dailyStreak.ts` (pure): localStorage streak math (current/best/last-date,
  resets if a UTC day is skipped). The routine hook.
- Daily-mode toggle in the game wrapper: fresh bounded run, "Daily · {date}" badge,
  today's-best in `localStorage`, GATES the endless progress POST (never clobbers endless).
- Backend daily leaderboard (Layer B) deferred — needs a backend table decision; local
  streak + share delivers routine value now.

### Phase 3 — Roguelike Perk Draft  *(goal: randomness, surprises, upgrades, gamified)*
Daily-run only.
- `lib/wordTower/perks.ts` (pure): perk catalogue + `drawPerkChoices(rng, owned)` (pick-1-of-3)
  + `applyPerks(...)` effect hooks. Offered at fixed height milestones within the daily run.
- Archetypes = **word→physics interactions**, not generic %:
  1. **Lead-Lined Vowels** — vowel-heavy words correct lean faster (stabilizer build).
  2. **Steel Floors** — words ≥6 letters become hazard/sabotage-proof floors.
  3. **Safety Net (rare letters)** — using Q/X/Z/J grants a one-shot net that catches the next miss.
  4. **Anagram Crane** — crane stops swinging; instead swap two tray letters once per floor.
  5. **Combo Insurance** — first hazard each run doesn't break combo.
  6. **Featherfall** — topples remove 1 fewer floor.

---

## TDD scope
Pure logic (clutchSave, dailySeed, dailyStreak, perks) → strict RED-GREEN-REFACTOR.
FX/physics (debris, shake, draft modal visuals) → test pure trigger logic only; verify
the rest visually (mind the dev-server HMR headless gotcha — watch a prod build).

## File-size guard
`WordTowerPlay.tsx` (~510) and `WordTowerScene.tsx` (~500) are at/over the 500 cap.
ALL new systems go in new files; wire in with minimal additions.
