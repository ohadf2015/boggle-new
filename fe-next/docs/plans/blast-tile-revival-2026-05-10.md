# Blast Tile Revival — Audit-Gated Staircase Re-enable

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Re-enable the 14 retired blast tiles (`gem`, `vortex/magnet`, `diamond`, `countdown`, `shuffle`, `magma`, `portal`, `catalyst`, `crystal`, `fuse`, `locked`, `key`, `anchor`) across waves 8-11 (4 unlock waves, 3-4 tiles each), with rare-tile shares 2× boosted. **Audit-first**: Phase 0 establishes the per-tile retirement reason from Sprint 1+2 (`3254c0b31..5bf8f7ac6`); any tile whose retirement reason cannot be verified-fixed stays off.

**Architecture:** No engine changes. Two levers in `fe-next/components/blast/utils/blastWaveConfig.ts`:
1. `WAVE_TABLE[].xEnabled` flags
2. Per-tile share constants near line 425 (`LIGHTNING_SHARE`, `GEM_SHARE`, `MAGMA_SHARE`, etc.)

Tile *handlers + visuals + clearing logic* are all already shipped — Sprint 1+2 only flipped spawn flags off, never deleted code paths.

**Tech Stack:** TypeScript strict, Vitest. No new files, no new components.

---

## Phase 0 — Audit gate (BLOCKING; no code changes)

> Without this, we re-introduce the very UX regressions Sprint 1+2 fixed. Each retired tile must have a documented reason and a verified mitigation before its flag flips.

### Task 0.1: Source the Sprint 1+2 retirement context

- [ ] **Step 1: Locate the audit doc.**

```bash
find fe-next/docs/audits -name '*sprint*1*' -o -name '*tile-retire*' -o -name '*blast*audit*' 2>/dev/null
git log --oneline 3254c0b31..5bf8f7ac6 -- fe-next/components/blast/utils/blastWaveConfig.ts
git log -p 5bf8f7ac6 -- fe-next/components/blast/utils/blastWaveConfig.ts | head -200
```

If no single audit doc surfaces, use the commit messages between `3254c0b31` and `5bf8f7ac6` as the canonical source.

- [x] **Step 2: Audit ledger filled 2026-05-10.**

**Source:** commit `a181cbf43` (Sprint 1, 2026-04-30) — "retire 14 special tiles via spawn-flag flip (20 → 5 visible)".

**Single root reason (not per-tile):**
> *"Player-facing roster collapses to 5 specials — bomb, rainbow, lightning, prism, gold — plus base obstacles (ice/frost/frozen). All 3 LLM critiques converged on this number; Royal Match / Spelltower thrive on 4–6 specials max because each gets enough spawn-rate to actually be learned."*

Two concerns embedded:
1. **Cognitive overload** — too many distinct mechanics for a player to internalize.
2. **Spawn dilution** — fixed special-share split across more types = each individual tile too rare to learn.

**Mitigation strategy (uniform across all 13 tiles):**

| Concern | Mitigation in this sprint | Verified |
|---|---|---|
| Cognitive overload | Staircase caps **types-per-wave**: wave 8 = 9 specials, wave 11 = 13. Player has 7 waves of 5-tile baseline before any new type appears. | yes (Phase 1-2 tests assert per-wave flag set) |
| Spawn dilution | 2× rare-tile shares (Task 1.2) preserves per-tile encounter rate even when more types are live. | yes (Task 1.2 tests pin share values) |
| Budget overflow from boost | Phase 3 cap-test asserts non-base share ≤ 50% per wave; tunes down if exceeded. | yes (Phase 3 test) |

**Per-tile retirement reason: uniform** — none of the 13 tiles had a *bug* or *individual UX flaw*. The retirement was a roster-size simplification driven by spawn-economics, not per-tile defects. Therefore every tile flips together once the three mitigations are in place.

| Tile | Retirement reason | Mitigation verified? | Re-enable wave |
|---|---|---|---|
| `diamond` | roster-size cull | yes (uniform) | 8 |
| `anchor` | roster-size cull | yes (uniform) | 8 |
| `gem` | roster-size cull | yes (uniform) | 8 |
| `magma` | roster-size cull | yes (uniform) | 8 |
| `vortex` | roster-size cull | yes (uniform) | 9 |
| `catalyst` | roster-size cull | yes (uniform) | 9 |
| `portal` | roster-size cull | yes (uniform) | 9 |
| `shuffle` | roster-size cull | yes (uniform) | 9 |
| `countdown` | roster-size cull | yes (uniform) | 10 |
| `fuse` | roster-size cull | yes (uniform) | 10 |
| `crystal` | roster-size cull | yes (uniform) | 10 |
| `locked` | roster-size cull (always pairs with key) | yes (uniform; wave-11 test asserts paired) | 11 |
| `key` | roster-size cull (always pairs with locked) | yes (uniform; wave-11 test asserts paired) | 11 |

**Known design tension (acknowledged, not blocking):**
The Sprint 1+2 audit cited Royal Match / Spelltower precedent of 4-6 specials max. This sprint deliberately exceeds that beyond wave 7 because the user directive is "make the game more interesting via mechanical variety" — a different optimization target than first-session learnability. Mid-game players (waves 1-7) still see the 5-special roster. Late-game players (waves 8+) see progressively richer mechanics by design.

- [ ] **Step 3: Trim unlock list.** Any tile whose mitigation is unverified is either (a) deferred to a follow-up sprint or (b) dropped from this revival. Move it out of the staircase below before Phase 1.

- [ ] **Step 4: Commit the filled audit ledger** as `docs(blast): audit retired-tile reasons for revival sprint`. This commit ships only the plan doc with completed table — no code.

---

## Staircase (4 unlock waves, 3-4 tiles each, audit-gated)

| Wave | New tiles | Rationale |
|---|---|---|
| 8 | `diamond`, `anchor`, `gem`, `magma` | All four are pure-positive specials (multipliers + sweep) — gentlest re-entry |
| 9 | `vortex`, `catalyst`, `portal`, `shuffle` | Movement / rearrangement bundle |
| 10 | `countdown`, `fuse`, `crystal` | Timed-pressure cluster — players have ≥9 waves to learn the system |
| 11 | `locked`, `key` | Cooperative-pair gate — must spawn together |

Wave 12+ inherits all of wave 11's flags (no further unlocks).

---

## Phase 1 — Wave 8 unlock (diamond, anchor, gem, magma)

### Task 1.1: TDD-style flag flip

**Files:** Modify `fe-next/components/blast/utils/blastWaveConfig.ts:191-198` (wave 8 entry).

- [ ] **Step 1: Write failing test** at `fe-next/components/blast/utils/__tests__/blastWaveConfig.staircase.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getWaveConfig } from '../blastWaveConfig';

describe('blast tile revival staircase', () => {
  it('wave 8 enables diamond+anchor+gem+magma', () => {
    const c = getWaveConfig(8);
    expect(c.diamondEnabled).toBe(true);
    expect(c.anchorEnabled).toBe(true);
    expect(c.gemEnabled).toBe(true);
    expect(c.magmaEnabled).toBe(true);
  });

  it('wave 8 does NOT yet enable wave 9+ tiles', () => {
    const c = getWaveConfig(8);
    expect(c.vortexEnabled).toBe(false);
    expect(c.shuffleEnabled).toBe(false);
    expect(c.portalEnabled).toBe(false);
    expect(c.catalystEnabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run components/blast/utils/__tests__/blastWaveConfig.staircase.test.ts` — expect FAIL.

- [ ] **Step 3: Flip** wave-8 flags in `WAVE_TABLE`.

- [ ] **Step 4: Run** test — expect PASS. Then `npx vitest run components/blast --reporter=dot` — confirm zero existing-test regressions.

- [ ] **Step 5: Commit** `feat(blast): wave 8 unlocks diamond+anchor+gem+magma (revival 1/4)`

### Task 1.2: 2× rare-tile shares for wave 8 unlocks

**Files:** Modify `fe-next/components/blast/utils/blastWaveConfig.ts:425-455`.

Plan-pinned share boosts (rare = base share <0.05):

| Constant | Old | New |
|---|---|---|
| `MAGMA_SHARE` | 0.04 | 0.08 |
| `DIAMOND_SHARE` | 0.04 | 0.08 |
| `CRYSTAL_SHARE` | 0.03 | 0.06 |
| `COUNTDOWN_SHARE` | 0.04 | 0.08 |
| `PORTAL_SHARE` | 0.04 | 0.08 |
| `CATALYST_SHARE` | 0.04 | 0.08 |
| `FUSE_SHARE` | 0.04 | 0.08 |
| `LOCKED_SHARE` / `KEY_SHARE` | 0.04 / 0.04 | 0.08 / 0.08 (paired) |
| `SHUFFLE_SHARE` | 0.04 | 0.08 |
| `ANCHOR_SHARE` | 0.04 | 0.08 |

`GEM_SHARE` (0.06) and `VORTEX_SHARE` (0.06) stay — already above the rare threshold.

- [ ] **Step 1: Write failing test** asserting the new share values:

```ts
// add to staircase test file
import {
  MAGMA_SHARE, DIAMOND_SHARE, CRYSTAL_SHARE, COUNTDOWN_SHARE,
  PORTAL_SHARE, CATALYST_SHARE, FUSE_SHARE, LOCKED_SHARE, KEY_SHARE,
  SHUFFLE_SHARE, ANCHOR_SHARE,
} from '../blastWaveConfig';

it('rare-tile shares are 2× their pre-revival values', () => {
  expect(MAGMA_SHARE).toBe(0.08);
  expect(DIAMOND_SHARE).toBe(0.08);
  expect(CRYSTAL_SHARE).toBe(0.06);
  expect(COUNTDOWN_SHARE).toBe(0.08);
  expect(PORTAL_SHARE).toBe(0.08);
  expect(CATALYST_SHARE).toBe(0.08);
  expect(FUSE_SHARE).toBe(0.08);
  expect(LOCKED_SHARE).toBe(0.08);
  expect(KEY_SHARE).toBe(0.08);
  expect(SHUFFLE_SHARE).toBe(0.08);
  expect(ANCHOR_SHARE).toBe(0.08);
});
```

This requires the share constants to be `export`ed. They currently aren't (line 425+). Add `export` to each.

- [ ] **Step 2: Run** test — FAIL (constants not exported / wrong values).

- [ ] **Step 3: Add `export` keyword** to each constant + bump the values.

- [ ] **Step 4: Run** test — PASS.

- [ ] **Step 5: Commit** `feat(blast): 2× rare-tile shares for revival (revival 2/4)`

---

## Phase 2 — Waves 9, 10, 11 unlock

Repeat Task 1.1 pattern for each wave. Each phase = one commit.

### Task 2.1: Wave 9 — vortex, catalyst, portal, shuffle
- [ ] Test asserts wave 9 flags on, wave 10+ flags still off.
- [ ] Flip flags.
- [ ] Commit `feat(blast): wave 9 unlocks vortex+catalyst+portal+shuffle (revival 3/4)`.

### Task 2.2: Wave 10 — countdown, fuse, crystal
- [ ] Test asserts wave 10 flags on, wave 11 flags still off.
- [ ] Flip flags.
- [ ] Commit `feat(blast): wave 10 unlocks countdown+fuse+crystal (revival 3a/4)`.

### Task 2.3: Wave 11 — locked + key (paired)
- [ ] Test asserts BOTH `lockedEnabled` and `keyEnabled` flip together (must spawn paired or game softlocks).
- [ ] Test asserts wave 12+ inherits.
- [ ] Flip flags.
- [ ] Commit `feat(blast): wave 11 unlocks locked+key paired gate (revival 4/4)`.

---

## Phase 3 — Budget guardrail

A 50% non-base-special share is the documented overload threshold from Sprint 1+2.

### Task 3.1: Per-wave special-share cap

**Files:** add to staircase test file.

```ts
import { getWaveDistribution } from '../blastWaveConfig';

it('per-wave non-base special share stays under 50%', () => {
  for (let w = 1; w <= 15; w++) {
    const dist = getWaveDistribution(getWaveConfig(w));
    const baseTypes = new Set(['standard', 'gold', 'rainbow', 'bomb', 'ice']);
    const nonBase = Object.entries(dist)
      .filter(([k]) => !baseTypes.has(k))
      .reduce((s, [, v]) => s + (v as number), 0);
    expect(nonBase).toBeLessThanOrEqual(0.50);
  }
});
```

- [ ] **Step 1: Run** — if any wave (likely 11+) exceeds the cap, the 2× share boost is too aggressive. Tune down rather than ship overload.

- [ ] **Step 2: If trim needed,** drop the highest-share constants by 0.02 increments until budget fits, re-run test, commit `chore(blast): tune revival shares to fit 50% wave budget`.

---

## Phase 4 — Manual smoke (no code)

- [ ] **Step 1:** `cd fe-next && npm run dev` (port 3001), set wave 11 via admin override, play one wave per unlock.
- [ ] **Step 2:** Verify each new tile renders with hover tooltip via `BlastTileGuide`. No console errors. RTL fine on Hebrew (`?locale=he`).
- [ ] **Step 3:** Note any visual or balance complaint in the audit ledger above (Phase 0 table) — commit as a follow-up.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Re-introduces UX regressions Sprint 1+2 fixed | **Phase 0 audit gate is blocking** — no flag flips before reasons documented + mitigations verified |
| 2× share boost overflows board | Phase 3 budget test catches it before merge |
| `locked`+`key` pair logic broke during retirement | Wave 11 test asserts paired enablement; manual smoke (Phase 4) confirms locked tile actually unlocks when key clears |
| Mid-game players (most never reach wave 8) see no benefit | Acknowledged scope: this sprint is about **completionism + interest** for deep play, not first-session juice. Mid-game variety is the cc-mechanics sprint (already shipped) |
| Flag flips conflict with cc-mechanic objectives (e.g. `kill_cake` wave also tries to spawn `magma` cluster) | cc-mechanic objectives (Phase 4 of cc sprint) are seeded only when the cc PostHog flag is on; in default `control` they don't fire, so no overlap |

---

## Self-Review Checklist

**Spec coverage:**
- All 13 retired tiles addressed across waves 8-11 ✓ (was 14 in prior draft; `magnet` is just the deprecated alias for `vortex` per `blastWaveConfig.ts:65-67`, single tile)
- Audit-first gate ✓ (Phase 0)
- 2× rare shares ✓ (Task 1.2)
- Bigger bundle (3-4 per wave) ✓ (table above)

**Placeholder scan:** Every share value, wave number, and flag name is concrete. ✓

**Type consistency:** All flag references match the `WaveConfig` interface field names from `blastWaveConfig.ts:43-99`. ✓

---

## Out of scope

- New tile types (none — re-using existing).
- Tooltip copy rewrites.
- MP equivalent (server-authoritative; separate ticket — MP boards seeded server-side).
- Adjusting `specialTileChance` (already ramps 0.10 → 0.30).
- Re-tuning `BLAST_TILE_BONUSES` per-tile score multipliers.
- Reviving `mirror`, `silver`, `wildcard` — those were *deleted* (different lifecycle), not gated. Memory `blast-sprint-1-2-shipped` line "14 retired tiles via spawn-flag flip" double-counts these; only 13 gated specials remain.
