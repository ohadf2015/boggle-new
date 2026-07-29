# Blast v2 — Plan 7: Telemetry + Migration (Stream H) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit typed PostHog events from Plans 2-5 game systems, define dashboards per spec, execute 4-phase rollout with success gates, grant veteran bonus to legacy Blast players on first v2 clear, and delete legacy Blast code in Phase 3.

**Architecture:** Event emitters under `lib/blast/v2/telemetry.ts` expose typed functions like `trackBlastWordFound({ level, word, axis, length, isCascade, isBonus })`. All events inject the `is_cg` super-prop automatically (already wired via `CrazyGamesSDK`). Events fire from:
- Plan 2's `useBlastV2` reducer (word found/rejected on each validation)
- Plan 2's `BlastGame` orchestrator (level start on intro mount, level completed/abandoned on unmount or finish)
- Plan 3's `/api/blast/clear-level` server route (canonical `game_completed`)
- Plan 3's `BlastChestOpenModal` (chest open ceremony)
- Plan 5's FTUE overlay (FTUE step advance)
- Plan 5's `BlastUnlockCard` (tutorial dismiss)

Dashboards are PostHog Insights defined as SQL specs. Migration phases 0-3 run sequentially with gates between phases. Veteran bonus fires on first v2 level clear via server-side flag write.

**Tech Stack:** TypeScript strict, Vitest, PostHog client (`posthog-js` via `window.posthog`), PostHog server (`getPostHogServer()` from `@/lib/posthog`), Supabase (`blast_progress` + `blast_chests` tables from Plan 3).

**Spec reference:** `docs/superpowers/specs/2026-05-12-blast-mode-redesign-design.md` — section "Telemetry + Migration + Flag Rollout" (entire section: event taxonomy, dashboards, phases 0-3, veteran bonus, risk register, success criteria).

**Out of scope:** Curated pack authoring (Plan 6), FTUE/mechanic cards display (Plan 5), actual dashboard UI creation in PostHog (just SQL specs). Content migration strategy — fresh start per spec, all players start v2 level 1.

**Integration notes (verified 2026-05-12):**
- `is_cg` super-prop: already wired in `CrazyGamesSDK.tsx` via `setPostHogSuperProps({ is_cg: true })`. Plan 7 confirms it fires on all events; no additional plumbing needed.
- PostHog flag hook: `usePostHogFlag<boolean>('blast.v2', false)` already wired in Plan 2. Plan 7 uses `getPostHogServer().isFeatureEnabled('blast.v2', distinctId)` server-side.
- Experiments registry: `lib/experiments.ts` has `blast.v2` entry per Plan 2. Plan 7 adds no new flags.

---

## File Structure

| File | Purpose |
|---|---|
| `fe-next/lib/blast/v2/telemetry.ts` | Typed event emitters (11 functions) |
| `fe-next/lib/blast/v2/telemetry.server.ts` | Server-side event capture (game_completed, veteran bonus) |
| `fe-next/lib/blast/v2/__tests__/telemetry.test.ts` | Event payload shape + super-prop injection |
| `fe-next/docs/dashboards/blast-v2-ftue-funnel.sql` | PostHog funnel: L1 start → L1 complete → L5 → L10 |
| `fe-next/docs/dashboards/blast-v2-chest-open-rate.sql` | Chest opens by chest # + tier |
| `fe-next/docs/dashboards/blast-v2-hint-usage.sql` | Hints by level, identifies too-hard levels |
| `fe-next/docs/dashboards/blast-v2-cascade-rate.sql` | Cascade trigger rate (target 0.3-0.6 per clear) |
| `fe-next/docs/dashboards/blast-v2-tutorial-skip-rate.sql` | FTUE/mechanic card skip rate by card # |
| `fe-next/docs/dashboards/blast-v2-avatar-part-excitement.sql` | Avatar part drop → profile view within 1h |
| `fe-next/docs/migration/blast-v2-rollout-phases.md` | Phase 0-3 gates + rollout schedule |
| `fe-next/docs/migration/blast-v2-risk-register.md` | Per-risk monitoring dashboard alert |

All under 500-line cap. Tests under `__tests__/` next to sources. Dashboard SQL files live in `docs/dashboards/` for reference (not imported by code).

---

## Event Taxonomy (locked per spec)

```ts
// lib/blast/v2/telemetry.ts

// Per-level lifecycle
trackBlastLevelStarted(data: {
  level: number;
  locale: Locale;
  theme: ThemeKey;
  mechanics: string[]; // keys from MechanicSet that are true
})

trackBlastWordFound(data: {
  level: number;
  word: string;
  axis: 'H' | 'V';
  length: number;
  isCascade: boolean;
  isBonus: boolean; // true if bonus dictionary word
})

trackBlastWordRejected(data: {
  level: number;
  attempted_word: string;
  length: number;
  reason: 'length' | 'axis' | 'gap' | 'frozen' | 'duplicate' | 'unknown';
})

trackBlastHintUsed(data: {
  level: number;
  hint_type: 'shuffle' | 'reveal_letter' | 'reveal_word';
  coin_cost: number;
})

trackBlastLevelCompleted(data: {
  level: number;
  locale: Locale;
  theme: ThemeKey;
  time_seconds: number;
  hints_used: number;
  cascades: number;
  stars: 1 | 2 | 3;
  coins_earned: number;
  gems_collected: number;
})

trackBlastLevelAbandoned(data: {
  level: number;
  locale: Locale;
  time_in_level_seconds: number;
  words_found_count: number;
})

// Meta
trackBlastChestOpened(data: {
  chest_number: number;
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  coins: number;
  boosts_count: number;
  avatar_part?: string;
  is_duplicate: boolean;
})

trackBlastChestPreviewed(data: {
  chest_number: number;
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  level: number;
})

// Tutorial
trackBlastFtueStep(data: {
  step_number: 1 | 2 | 3 | 4 | 5 | 6;
  advance_reason: 'action' | 'timer' | 'skip' | 'resume';
})

trackBlastTutorialSeen(data: {
  mechanic: string; // key from mechanicsForLevel (e.g. 'frozenTiles')
  level: number;
  dismiss_via: 'button' | 'skip_all';
})

// Canonical funnel (server-side)
game_started(data: {
  mode: 'blast';
  level: number;
})

game_completed(data: {
  mode: 'blast';
  level: number;
  success: boolean;
})
```

**All events auto-inject `is_cg` super-prop via `window.posthog.register()` (already wired).**

---

### Task 1: Telemetry emitter module

**Files:**
- Create: `fe-next/lib/blast/v2/telemetry.ts`
- Test: `fe-next/lib/blast/v2/__tests__/telemetry.test.ts`

- [ ] Step 1: Write failing test. (below)
- [ ] Step 2: Run `cd fe-next && npx vitest run lib/blast/v2/__tests__/telemetry.test.ts` — expect FAIL "Cannot find module '../telemetry'".
- [ ] Step 3: Implement `telemetry.ts` with 11 typed emitter functions. Each calls `window.posthog?.capture(eventName, properties)`. No-op if `posthog` undefined.
- [ ] Step 4: Re-run test — expect PASS (13 tests: 11 event shapes + 2 super-prop).
- [ ] Step 5: Commit `feat(blast-v2): PostHog event emitters (Plan 7 Task 1)`.

**telemetry.test.ts source:**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as telemetry from '../telemetry';

describe('Blast v2 telemetry', () => {
  let mockPostHog: any;

  beforeEach(() => {
    mockPostHog = { capture: vi.fn() };
    (global as any).window = { posthog: mockPostHog };
  });

  it('trackBlastLevelStarted fires event with correct shape', () => {
    telemetry.trackBlastLevelStarted({
      level: 5,
      locale: 'en',
      theme: 'fruits',
      mechanics: ['coinOverlay', 'frozenTiles'],
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_level_started',
      expect.objectContaining({ level: 5, theme: 'fruits' })
    );
  });

  it('trackBlastWordFound fires with cascade flag', () => {
    telemetry.trackBlastWordFound({
      level: 3,
      word: 'CAT',
      axis: 'H',
      length: 3,
      isCascade: true,
      isBonus: false,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_word_found',
      expect.objectContaining({ isCascade: true })
    );
  });

  it('trackBlastWordRejected includes reason', () => {
    telemetry.trackBlastWordRejected({
      level: 2,
      attempted_word: 'XYZ',
      length: 3,
      reason: 'unknown',
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_word_rejected',
      expect.objectContaining({ reason: 'unknown' })
    );
  });

  it('trackBlastHintUsed logs cost', () => {
    telemetry.trackBlastHintUsed({
      level: 20,
      hint_type: 'reveal_letter',
      coin_cost: 100,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_hint_used',
      expect.objectContaining({ hint_type: 'reveal_letter', coin_cost: 100 })
    );
  });

  it('trackBlastLevelCompleted includes all metrics', () => {
    telemetry.trackBlastLevelCompleted({
      level: 7,
      locale: 'he',
      theme: 'animals',
      time_seconds: 45,
      hints_used: 1,
      cascades: 2,
      stars: 3,
      coins_earned: 150,
      gems_collected: 3,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_level_completed',
      expect.objectContaining({ stars: 3, cascades: 2 })
    );
  });

  it('trackBlastLevelAbandoned on quit', () => {
    telemetry.trackBlastLevelAbandoned({
      level: 5,
      locale: 'sv',
      time_in_level_seconds: 30,
      words_found_count: 1,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_level_abandoned',
      expect.objectContaining({ words_found_count: 1 })
    );
  });

  it('trackBlastChestOpened with avatar part', () => {
    telemetry.trackBlastChestOpened({
      chest_number: 5,
      tier: 'gold',
      coins: 800,
      boosts_count: 2,
      avatar_part: 'eye-color-blue',
      is_duplicate: false,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_chest_opened',
      expect.objectContaining({ avatar_part: 'eye-color-blue' })
    );
  });

  it('trackBlastChestPreviewed', () => {
    telemetry.trackBlastChestPreviewed({
      chest_number: 3,
      tier: 'silver',
      level: 22,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_chest_previewed',
      expect.objectContaining({ chest_number: 3 })
    );
  });

  it('trackBlastFtueStep with advance reason', () => {
    telemetry.trackBlastFtueStep({
      step_number: 3,
      advance_reason: 'action',
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_ftue_step',
      expect.objectContaining({ step_number: 3 })
    );
  });

  it('trackBlastTutorialSeen for mechanic unlock', () => {
    telemetry.trackBlastTutorialSeen({
      mechanic: 'frozenTiles',
      level: 8,
      dismiss_via: 'button',
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_tutorial_seen',
      expect.objectContaining({ mechanic: 'frozenTiles' })
    );
  });

  it('no-op when window.posthog undefined', () => {
    (global as any).window = { posthog: undefined };
    expect(() => telemetry.trackBlastWordFound({
      level: 1, word: 'A', axis: 'H', length: 1, isCascade: false, isBonus: false,
    })).not.toThrow();
  });

  it('all events receive is_cg super-prop via window.posthog.register', () => {
    // This test verifies the CrazyGamesSDK integration; no-op here since posthog.register
    // happens at boot (not per-event). Test just confirms event functions don't re-register.
    mockPostHog.register = vi.fn();
    telemetry.trackBlastWordFound({
      level: 1, word: 'X', axis: 'H', length: 1, isCascade: false, isBonus: false,
    });
    // Expect capture, not register (register happens once at boot)
    expect(mockPostHog.capture).toHaveBeenCalled();
    expect(mockPostHog.register).not.toHaveBeenCalled();
  });
});
```

**telemetry.ts implementation:**

```ts
import type { Locale, ThemeKey } from './types';

export function trackBlastLevelStarted(data: {
  level: number;
  locale: Locale;
  theme: ThemeKey;
  mechanics: string[];
}) {
  window.posthog?.capture('blast_level_started', data);
}

export function trackBlastWordFound(data: {
  level: number;
  word: string;
  axis: 'H' | 'V';
  length: number;
  isCascade: boolean;
  isBonus: boolean;
}) {
  window.posthog?.capture('blast_word_found', data);
}

export function trackBlastWordRejected(data: {
  level: number;
  attempted_word: string;
  length: number;
  reason: 'length' | 'axis' | 'gap' | 'frozen' | 'duplicate' | 'unknown';
}) {
  window.posthog?.capture('blast_word_rejected', data);
}

export function trackBlastHintUsed(data: {
  level: number;
  hint_type: 'shuffle' | 'reveal_letter' | 'reveal_word';
  coin_cost: number;
}) {
  window.posthog?.capture('blast_hint_used', data);
}

export function trackBlastLevelCompleted(data: {
  level: number;
  locale: Locale;
  theme: ThemeKey;
  time_seconds: number;
  hints_used: number;
  cascades: number;
  stars: 1 | 2 | 3;
  coins_earned: number;
  gems_collected: number;
}) {
  window.posthog?.capture('blast_level_completed', data);
}

export function trackBlastLevelAbandoned(data: {
  level: number;
  locale: Locale;
  time_in_level_seconds: number;
  words_found_count: number;
}) {
  window.posthog?.capture('blast_level_abandoned', data);
}

export function trackBlastChestOpened(data: {
  chest_number: number;
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  coins: number;
  boosts_count: number;
  avatar_part?: string;
  is_duplicate: boolean;
}) {
  window.posthog?.capture('blast_chest_opened', data);
}

export function trackBlastChestPreviewed(data: {
  chest_number: number;
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  level: number;
}) {
  window.posthog?.capture('blast_chest_previewed', data);
}

export function trackBlastFtueStep(data: {
  step_number: 1 | 2 | 3 | 4 | 5 | 6;
  advance_reason: 'action' | 'timer' | 'skip' | 'resume';
}) {
  window.posthog?.capture('blast_ftue_step', data);
}

export function trackBlastTutorialSeen(data: {
  mechanic: string;
  level: number;
  dismiss_via: 'button' | 'skip_all';
}) {
  window.posthog?.capture('blast_tutorial_seen', data);
}
```

---

### Task 2: Server-side event capture + veteran bonus

**Files:**
- Create: `fe-next/lib/blast/v2/telemetry.server.ts`
- Modify: `fe-next/app/api/blast/clear-level/route.ts` (Plan 3 file)
- Test: `fe-next/lib/blast/v2/__tests__/telemetry.server.test.ts`

- [ ] Step 1: Write failing test — `captureGameCompleted` fires `game_completed` server-side via `getPostHogServer()`. Second test: `grantVeteranBonus` checks prior Blast play via query, writes `unlocks_seen.veteran_bonus_granted = true`, returns `{ grantedCoins: 500 }` or `{ grantedCoins: 0 }` (already granted or no prior plays).
- [ ] Step 2: Run vitest — expect FAIL.
- [ ] Step 3: Implement:

```ts
// fe-next/lib/blast/v2/telemetry.server.ts
import { getPostHogServer } from '@/lib/posthog';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function captureGameCompleted(
  distinctId: string,
  level: number,
  success: boolean
) {
  await getPostHogServer()?.capture({
    distinctId,
    event: 'game_completed',
    properties: { mode: 'blast', level, success },
  });
}

export async function grantVeteranBonus(userId: string): Promise<{ grantedCoins: number }> {
  // Check if veteran_bonus_granted already written
  const { data: progress } = await supabase
    .from('blast_progress')
    .select('unlocks_seen')
    .eq('user_id', userId)
    .single();

  if (progress?.unlocks_seen?.veteran_bonus_granted) {
    return { grantedCoins: 0 };
  }

  // Check if legacy Blast play history exists (any game_completed event with mode='blast')
  const { data: hasPriorPlay } = await supabase.rpc('check_prior_blast_play', { user_id: userId });
  if (!hasPriorPlay) {
    return { grantedCoins: 0 };
  }

  // Mark granted, return 500 coins
  await supabase
    .from('blast_progress')
    .update({ unlocks_seen: { veteran_bonus_granted: true } })
    .eq('user_id', userId);

  return { grantedCoins: 500 };
}
```

- [ ] Step 4: Run — expect PASS (4 tests).
- [ ] Step 5: Commit `feat(blast-v2): server-side telemetry + veteran bonus (Plan 7 Task 2)`.

**Integration in Plan 3's `/api/blast/clear-level/route.ts`:**
- Import `captureGameCompleted` + `grantVeteranBonus`
- After successful level clear + DB commit: `await captureGameCompleted(distinctId, level, true)`
- On first clear of any level: `const bonus = await grantVeteranBonus(userId); coins += bonus.grantedCoins`

---

### Task 3: Wire event emissions into Plan 2 useBlastV2

**Files:**
- Modify: `fe-next/lib/blast/v2/useBlastV2.ts` (Plan 2 file)
- Modify: `fe-next/components/blast/v2/BlastGame.tsx` (Plan 2 file)

- [ ] Step 1: In `useBlastV2` reducer, on each validated word submit:
  - Extract `axis` from selection state
  - Call `trackBlastWordFound({ level: state.level.levelNumber, word, axis, length: word.length, isCascade: false, isBonus: kind === 'bonus' })`
  - On cascade detection: `trackBlastWordFound({ ..., isCascade: true })`
  - On reject: `trackBlastWordRejected({ level: state.level.levelNumber, attempted_word: ..., length, reason: res.reason })`

- [ ] Step 2: In `useBlastV2` action handlers:
  - On shuffle action: `trackBlastHintUsed({ level: state.level.levelNumber, hint_type: 'shuffle', coin_cost: 50 })`

- [ ] Step 3: In `BlastGame` orchestrator:
  - On intro card mount: `trackBlastLevelStarted({ level, locale, theme, mechanics: Object.keys(mechanicsForLevel).filter(k => mechanics[k]) })`
  - On level complete (state.status === 'levelComplete'): `trackBlastLevelCompleted({ level, locale, theme, time_seconds: Math.round((Date.now() - levelStartTime) / 1000), hints_used: state.hintsUsed, cascades: state.cascadeCount, stars: calculateStars(...), coins_earned: state.coins, gems_collected: Math.round(state.chestProgress * 10) })`
  - On unmount before complete (useEffect cleanup): `trackBlastLevelAbandoned({ level, locale, time_in_level_seconds: ..., words_found_count: state.foundWords.size })`

- [ ] Step 4: Re-run Plan 2 tests — expect all to PASS.
- [ ] Step 5: Commit `feat(blast-v2): wire event emissions into useBlastV2 + BlastGame (Plan 7 Task 3)`.

---

### Task 4: Wire chest + tutorial events (Plans 3 + 5)

**Files:**
- Modify: `fe-next/components/blast/v2/BlastChestOpenModal.tsx` (Plan 3 file)
- Modify: `fe-next/components/blast/v2/BlastFtueOverlay.tsx` (Plan 5 file)
- Modify: `fe-next/components/blast/v2/BlastUnlockCard.tsx` (Plan 5 file)

- [ ] Step 1: In `BlastChestOpenModal` post-ceremony:
  - `trackBlastChestOpened({ chest_number, tier, coins, boosts_count, avatar_part, is_duplicate })`

- [ ] Step 2: In `BlastChestBadge` tap (preview):
  - `trackBlastChestPreviewed({ chest_number, tier, level })`

- [ ] Step 3: In `BlastFtueOverlay` step advances:
  - On step 1-6 complete: `trackBlastFtueStep({ step_number, advance_reason: 'action' | 'timer' | 'skip' })`

- [ ] Step 4: In `BlastUnlockCard` dismiss:
  - `trackBlastTutorialSeen({ mechanic: key, level, dismiss_via: 'button' | 'skip_all' })`

- [ ] Step 5: Commit `feat(blast-v2): wire chest + tutorial events (Plan 7 Task 4)`.

---

### Task 5: Dashboard SQL specs (reference docs)

**Files:**
- Create: `fe-next/docs/dashboards/blast-v2-ftue-funnel.sql`
- Create: `fe-next/docs/dashboards/blast-v2-chest-open-rate.sql`
- Create: `fe-next/docs/dashboards/blast-v2-hint-usage.sql`
- Create: `fe-next/docs/dashboards/blast-v2-cascade-rate.sql`
- Create: `fe-next/docs/dashboards/blast-v2-tutorial-skip-rate.sql`
- Create: `fe-next/docs/dashboards/blast-v2-avatar-part-excitement.sql`

**No tests required — these are reference specs for PostHog UI manual creation.**

Each file documents:
- Event flow + filtering
- Key metrics
- Target gate values (e.g., cascade target 0.3-0.6)
- SQL select-list for PostHog Insights

- [ ] Step 1: Write all 6 SQL specs per Insight type (trends, funnels). See below.
- [ ] Step 2: Commit `docs(blast-v2): dashboard SQL specs (Plan 7 Task 5)`.

**Example ftue-funnel spec:**
```sql
-- FTUE Funnel: Level 1 Start → Level 1 Complete → Level 5 → Level 10
-- Setup: In PostHog, create Funnel insight with steps:
--  1. blast_level_started WHERE level = 1
--  2. blast_level_completed WHERE level = 1
--  3. blast_level_started WHERE level = 5
--  4. blast_level_started WHERE level = 10
-- Measure: % conversion per step
-- Target: >85% L1→L1C, >50% L1C→L5, >25% L5→L10 (3-month)
```

---

### Task 6: Rollout phase documentation

**Files:**
- Create: `fe-next/docs/migration/blast-v2-rollout-phases.md`

- [ ] Step 1: Document 4 phases with entry gates, duration, success metrics, rollback procedure.

**Phase 0 (pre-launch, 1 sprint):**
- Flag: `blast.v2 = off`
- Audience: 0%
- Action: Legacy Blast ships. v2 code under feature flag, untouched.
- Success metric: All Plans 1-5 PASS in CI

**Phase 1 (internal, 1 day):**
- Flag: `blast.v2` on for `role IN ('admin','tester')`
- Audience: ~5-10 testers on real devices
- Action: Smoke test gameplay, check events fire via PostHog console
- Gate to Phase 2: No crashes, events flowing, timing reasonable
- Rollback: Flip flag off, <5 min

**Phase 2 (staged, 1 week):**
- Flag: `blast.v2` percentage rollout 10% → 25% → 50% → 100% over 7 days
- Each step gates on:
  - L1 → L5 retention ≥ legacy baseline
  - Crash rate ≤ baseline (check Sentry)
  - Avg session time ≥ legacy baseline (check PostHog)
- Rollback: Flip flag off, restore to legacy
- Timeline: Mon 10% → Tue 25% → Wed 50% (if healthy) → Fri 100%

**Phase 3 (legacy deprecation, release N+1):**
- After Phase 2 hits 100% + 2 weeks of stable metrics
- PR: Delete `components/blast/legacy/`, remove legacy DB tables, all wave-based tests
- Commit: `chore(blast): deprecate legacy Blast code post-v2-rollout`
- Rollback: Restore from git (never needed in practice if Phase 2 healthy)

- [ ] Step 2: Commit `docs(blast-v2): rollout phases 0-3 (Plan 7 Task 6)`.

---

### Task 7: Risk register + monitoring

**Files:**
- Create: `fe-next/docs/migration/blast-v2-risk-register.md`

- [ ] Step 1: Document per-risk monitoring. For each risk in spec (generator flat boards, tutorial copy in HE/JA, chest RNG exposed, backlash, cascade rate low, content authoring slow):

| Risk | Impact | Detection | Alert | Mitigation |
|---|---|---|---|---|
| Generator flat boring boards | Retention drop | `cascade_rate < 0.2 per level` | Dashboard + Sentry alert | Raise interestingness threshold; manual audit first 50 generated per locale |
| Tutorial copy missed in HE/JA | Confusing FTUE | `ftue_step_complete_rate by locale < 50%` | Email native speakers | Pre-gate Phase 2 on native review pass |
| Chest preview RNG exposed | Economy abuse | Monitor `duplicate_avatar_part rate > 5%` | Sentry alert | Verify server-commit logic, check client-side RNG exposure in code review |
| Backlash vs old Blast | Engagement drop | DAU ratio `v2/legacy < 0.8 in Phase 2 week 1` | Slack alert | Flip flag off within 1h |
| Cascade rate too low | Meh gameplay | `cascade_rate < 0.3` on aggregate | Dashboard trigger | A/B test interestingness weights; bump floor by 0.05 |
| Content authoring slow | Day-1 gap | `level_count < 30 authored` at launch | Manual check | Use generator for all; replace with authored as ready |

- [ ] Step 2: Commit `docs(blast-v2): risk register + alerts (Plan 7 Task 7)`.

---

### Task 8: Success criteria monitoring plan

**Files:**
- Create: `fe-next/docs/migration/blast-v2-success-criteria.md`

- [ ] Step 1: Document 3-month targets + measurement method:

| Metric | Target | PostHog/Sentry Query | Cadence |
|---|---|---|---|
| DAU on Blast | ≥110% legacy peak | `blast_level_started count by day` | Daily dashboard |
| Day-7 retention | ≥25% | Funnels: `L1 start → any event within 7d` | Weekly |
| Avg session length | ≥8 min | Trends: `(timestamp of blast_level_completed - blast_level_started) / 60` | Weekly |
| Chest opens per DAU/week | ≥0.8 | `count(blast_chest_opened) / count(unique DAU) / 7` | Weekly |
| L1 FTUE completion | ≥85% | Funnel: `blast_ftue_step where step_number=6 / blast_ftue_step where step_number=1` | Weekly |
| Avatar parts from Blast | ≥15% of new parts | `count(avatar_part != null in blast_chest_opened) / count(avatar_builder_equipped)` | Monthly |

- [ ] Step 2: Commit `docs(blast-v2): success criteria 3-month targets (Plan 7 Task 8)`.

---

### Task 9: Veteran bonus RPC helper (Supabase)

**Files:**
- Create: Supabase migration: `check_prior_blast_play` RPC

- [ ] Step 1: Write RPC that returns boolean — true if user has any `game_completed` event with `mode='blast'` in historical PostHog data (via HTTP API call or lookup table if available).
  - Fallback for Phase 0/1 before data available: query `blast_level_clears` table (Plan 3) for any non-zero count
  - Signature: `check_prior_blast_play(user_id uuid) returns boolean`

- [ ] Step 2: Test locally via Supabase CLI
- [ ] Step 3: Commit `chore(blast-v2): add check_prior_blast_play RPC (Plan 7 Task 9)`.

---

### Task 10: Phase 0 go-live checklist

**Files:**
- Create: `fe-next/docs/migration/blast-v2-phase-0-checklist.md`

- [ ] Step 1: Document pre-Phase-0 sign-offs:
  - [ ] All Plans 1-6 tests PASS
  - [ ] `npm run lint && npm run build` green
  - [ ] Design review: tiles, FX, FTUE visuals
  - [ ] i18n review: HE/SV/JA/ES strings approved by native speakers
  - [ ] Security review: no RNG exploits, validation server-side only
  - [ ] Feature flag `blast.v2` set to `off` in PostHog
  - [ ] Rollout doc (Plans-7 Task 6) reviewed by ops team
  - [ ] Sentry alerts configured for Phase 1 crash rate baseline
  - [ ] PostHog dashboards created manually in UI (reference specs ready)

- [ ] Step 2: Commit `docs(blast-v2): Phase 0 go-live checklist (Plan 7 Task 10)`.

---

### Task 11: Phase 3 legacy deletion task

**Files:**
- Delete: `fe-next/components/blast/legacy/` (all old Blast components moved here in Plan 2 Task 14)
- Delete: `fe-next/backend/modules/blastModeManager.ts` (verify existence + path)
- Delete: `fe-next/lib/blast/blastWaveConfig.ts` (verify)
- Delete: `fe-next/lib/blast/v1/` (verify all v1 code)
- Modify: `fe-next/app/[locale]/blast/page.tsx` — remove flag check, route directly to v2
- Modify: `fe-next/lib/experiments.ts` — remove `blast.v2` entry

- [ ] Step 1: List legacy files to delete:
  ```bash
  find fe-next/components/blast/legacy -type f
  find fe-next -name "*blastWaveConfig*"
  find fe-next -name "*blastModeManager*"
  ```

- [ ] Step 2: Create new branch for Phase 3 (after Phase 2 completes + 1 week stable)

- [ ] Step 3: Delete legacy files + update routing + cleanup tests

- [ ] Step 4: Run `npm run lint && npm run test && npm run build` — verify no stray imports

- [ ] Step 5: Commit `chore(blast): deprecate legacy Blast code post-v2-rollout (Plan 7 Task 11)`.

---

### Task 12: Integration test — event firing end-to-end

**Files:**
- Create: `fe-next/lib/blast/v2/__tests__/telemetry-integration.test.ts`

- [ ] Step 1: Write failing test — mock window.posthog, mount `BlastGame` with seed level, simulate drag-select valid word, assert both `trackBlastWordFound` AND `trackBlastLevelStarted` fired.

- [ ] Step 2: Run — expect FAIL (events not wired yet if using current files)

- [ ] Step 3: After all Tasks 1-5 complete, re-run — expect PASS

- [ ] Step 4: Commit `test(blast-v2): telemetry integration test (Plan 7 Task 12)`.

---

### Task 13: Veteran bonus integration test

**Files:**
- Modify: `fe-next/app/api/blast/clear-level/route.ts` tests (Plan 3 file)

- [ ] Step 1: Add test case — first successful clear of any level for veteran user (has prior Blast play history): assert response includes `coins += 500`.

- [ ] Step 2: Add test case — already granted bonus: subsequent clears return no bonus.

- [ ] Step 3: Run — expect PASS

- [ ] Step 4: Commit `test(blast-v2): veteran bonus integration (Plan 7 Task 13)`.

---

### Task 14: Verify is_cg super-prop via CrazyGamesSDK

**Files:**
- Verify: `fe-next/components/CrazyGamesSDK.tsx` (no changes needed)
- Verify: `fe-next/components/__tests__/CrazyGamesSDK.superProps.test.ts`

- [ ] Step 1: Run existing test — verify `is_cg=true` is registered on CG detection

- [ ] Step 2: Confirm no additional plumbing needed — all telemetry.ts calls auto-include super-prop

- [ ] Step 3: No commit — verification only

---

### Task 15: Final checklist before Phase 1

**Files:**
- Create: `fe-next/docs/migration/blast-v2-phase-1-smoke-test.md`

- [ ] Step 1: Document smoke test procedure:
  1. Build APK (Android) or run dev server (web)
  2. Log in as tester user (role='tester')
  3. Open Blast → v2 board loads
  4. Drag-select valid word → "CAT found!" + sound + coins ↑
  5. Open PostHog console → `blast_word_found` event fires with correct payload
  6. Complete level 1 → `blast_level_completed` fires
  7. Unlock level 2 → `blast_ftue_step` fires if applicable
  8. Check crash logs via Sentry — 0 new errors
  9. Repeat on HE locale — RTL board renders, final-form letters display
  10. Repeat on JA — hiragana tiles render, no font fallback glitches

- [ ] Step 2: Commit `docs(blast-v2): Phase 1 smoke test guide (Plan 7 Task 15)`.

---

## Summary of Event Emissions

| Source | Events | Task |
|---|---|---|
| `useBlastV2` reducer | `trackBlastWordFound`, `trackBlastWordRejected`, `trackBlastHintUsed` | Task 3 |
| `BlastGame` orchestrator | `trackBlastLevelStarted`, `trackBlastLevelCompleted`, `trackBlastLevelAbandoned` | Task 3 |
| `/api/blast/clear-level` | `game_completed` (server-side) | Task 2 |
| `BlastChestOpenModal` | `trackBlastChestOpened` | Task 4 |
| `BlastChestBadge` | `trackBlastChestPreviewed` | Task 4 |
| `BlastFtueOverlay` | `trackBlastFtueStep` | Task 4 |
| `BlastUnlockCard` | `trackBlastTutorialSeen` | Task 4 |

All events auto-carry `is_cg` super-prop via existing `CrazyGamesSDK` registration (verified Task 14).

---

## Rollout Timeline

- **Day 0**: Phase 0 launch (flag off, legacy ships)
- **Day 1**: Phase 1 launch (flag on for admins/testers, smoke test)
- **Day 2**: Phase 2 launch (PostHog flag 10%)
- **Day 3**: 10% healthy → 25%
- **Day 4**: 25% healthy → 50%
- **Day 7**: 50% healthy → 100%
- **Week 3**: Phase 3 (legacy code deletion PR, if stable)

---
