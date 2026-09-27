# Brain Training Module Audit — 2026-06-12

Goal: find loose ends, gaps, fun-blockers; assess feedback & celebrations.

Module is mature: 5 drills (lightning-round, memory-hunt, combo-master, pattern-switcher,
rare-gems), forgiving+honest scoring, leveling, unlock gating, hub w/ radar/history,
research intros, first-game confetti, post-drill progression overlay. Skeleton is good.
Problems are in the **seams**, not missing systems.

---

## ROOT FINDING (P0, verified by guard trace) — drills are SILENT

`SoundEffectsContext.playSound` defaults `requiresGameActive = true`
(`contexts/SoundEffectsContext.tsx:253-255`). It hard-returns unless
`isGameActiveRef.current === true`, set only via `setGameActive(true)`
(`SoundEffectsContext.tsx:68-72`).

**No brain drill route or component ever calls `setGameActive`.** Verified across
`app/[locale]/brain/**` and `components/drills/**`. Consequence:

- All per-action drill sounds no-op. The 4 newer drills (Memory/Lightning/Combo/Pattern)
  call almost no sounds anyway; RareGems calls 7 but **6 are silently dropped** by the guard.
- Only `playChestOpenSound` fires in any drill — it alone passes `requiresGameActive: false`
  (`useSoundPlayFunctions.ts:133`). That's why RareGems' pouch-full *seems* to have audio.

So "RareGems is the juicy reference, others are silent clones" is FALSE — they're all
near-silent. `audioUnlocked` is fine (global first-gesture unlock, `MusicContext.tsx:307`).

**Fix = call `setGameActive(true)` during drill play.** Unmutes RareGems' 6 existing
calls instantly; prerequisite for wiring the other 4 drills.

---

## FIX SET (this change) — feedback & celebration

### Phase 1 — game-active linchpin (P0)
Drills toggle `setGameActive(true)` when play begins, `false` on exit/unmount.
Shared hook so all 5 drills behave identically and clean up (avoid leaking active
state into other game modes).

### Phase 2 — per-action audio in the 4 silent drills (P0/P1)
All sound fns + MP3 assets already exist; just unwired.
- ComboMaster (`components/drills/ComboMaster.tsx`): `playComboMilestoneSound` at combo
  thresholds, `playComboBreakSound` on break, `playWordAcceptedSound` per valid word.
  A "combo" drill with silent combos is the inverse of juice.
- LightningRound (`LightningRound.tsx`): `playWordAcceptedSound` per word,
  `playTimerUrgentSound` in final seconds (speed drill needs urgency).
- PatternSwitcher (`PatternSwitcher.tsx`): `playWordAcceptedSound` / a switch chime on
  rule change (`playBoardShuffleSound`).
- MemoryHunt (`MemoryHunt.tsx` + `useMemoryHuntGame.ts`): `playWordAcceptedSound` on
  recalled word, `playWordRejectedSound`/error on wrong (already have life loss).
Haptics ride along free — most fns call `haptics.*` internally.

### Phase 3 — celebration audio+haptic (P1)
These fns pass `requiresGameActive: false`, so they fire post-play with no guard issue.
- `DrillProgressionOverlay.tsx` (single surface, fires for all drills): on open,
  `playLevelUpModalSound` if level promoted else `playAchievementSound`;
  `playTierPromotionSound` on tier change. Currently visually rich, **zero audio/haptic**.
- `FirstGameCelebration.tsx`: `playAchievementSound` on mount (confetti currently silent).

---

## BACKLOG (real loose ends, NOT in this change — separate diffs)

- **D (P0 retention):** Guest plays a drill, submit → 401, client swallows it silently
  (`hooks/useSaveDrillResult.ts:101`). No sign-up nudge; progress lost. Needs auth-prompt
  on 401 at drill submit. Also gate/relabel drill entry for guests.
- **F (P1):** Hub zero-games state — degenerate radar + 0/100 domain tiles look broken,
  not "start playing" (`CognitiveRadarChart`, `CognitiveDomainGrid`). Duplicate "Let's
  Train" cards (`brain/PageClient.tsx:334` and `:503`). History needs ≥2 entries (`:447`)
  → empty on games 1-2.
- **G (P1/P2):** Verify `brain.*` key coverage in he/sv/ja/es (en complete). Run
  `scripts/find-missing-translations.js`.
- **E (P1, low confidence):** Difficulty cliffs — MemoryHunt L5 (7 words / 3s study,
  1 life, `useMemoryHuntGame.ts:14`), ComboMaster L5 (20 combo / 3s window,
  `ComboMaster.tsx:21`). Gate on PostHog level-distribution first; most players may never
  reach L5.
- **Offline (P2):** Offline drill results skip the progression overlay (no `brainScore`
  returned), so offline players get zero celebration (`useSaveDrillResult.ts:81`).
- **First-game double-fire (P2):** `gamesAnalyzed === 1` gate can fire twice on fast
  back-to-back replay before localStorage flag sets (`brain/PageClient.tsx:135`).

---

## Verification note
Unit tests here mock the sound hook and assert the call — they do NOT prove audio plays.
The guard trace above + one real in-app run are the real proof that Phase 1/2 sound fires.
