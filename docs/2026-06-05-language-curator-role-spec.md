# Language Curator ("Native Moderator") Role — Design Spec

**Date:** 2026-06-05
**Status:** Design / proposed
**Author:** Ohad + Claude (council: Gemini, Grok; advisor review)

---

## 0. TL;DR — Can we do this?

**Yes, cheaply.** ~90% of the scaffolding already exists. A *Language Curator* is a trusted native speaker, scoped to one (or more) languages, who is **read-mostly with narrow, audited write powers on content quality** — explicitly **not** an admin.

The single most important design decisions (locked after council + advisor):

1. **Assignments table, NOT a `user_role` enum value.** The role is *additive* (a curator is also a player), *multi-language*, *revocable*, and *auditable*. An enum slot expresses none of that.
2. **Curators write to review/proposal tables, never to master content.** Their actions are *signals* that feed the existing verify→promote and nightly-improvement loops. Zero blast radius to live gameplay or leaderboards in v1.
3. **One `SECURITY DEFINER` helper `is_language_curator(lang)`** drives every RLS policy — no per-table logic sprawl.
4. **"See players in their language" → anonymous aggregates only in v1** (privacy: curators are semi-trusted volunteers; we just opened to EU/EEA).

---

## 1. What the curator can do (capabilities)

| # | Capability | v1 write target | Blast radius |
|---|---|---|---|
| 1 | Review Connections puzzles in their language; flag good/bad + note | `connections_puzzle_reviews` (verdict good/bad/unsure) | **None** — advisory-only, feeds nightly improvement loop. Verified: nothing auto-flips `is_active` or daily selection. |
| 2 | See rejected / not-in-dictionary words; approve/add valid ones | **Proposal row** → existing verify→promote pipeline (NOT a direct `word_scores` write in v1) | Contained — admin/pipeline ratifies before it reaches gameplay |
| 3 | See & flag invalid/wrong words | Proposal/flag row | Contained |
| 4 | Overview of players/activity in their language | **Read-only aggregates** via `SECURITY DEFINER` RPC | None — no per-user PII |

---

## 2. Grounding — what already exists (verified against live prod schema)

**Auth / roles**
- `profiles.is_admin` (bool, 2 admins) — primary admin gate, checked in `lib/auth/adminAuth.ts` `verifyAdminAuth()` and in RLS via `EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND is_admin=true)`.
- `profiles.user_role` enum = **`{student, teacher, admin}`** (no curator). Frontend computes `isTeacher` in `contexts/auth/hooks/useAuthState.ts`.
- `profiles.admin_role` (text) — **dead** (0 rows populated; legacy Express RBAC). Ignore.
- `profiles.language` (text) — **EXISTS**, but only **~40% populated** (32/81 profiles; set only when a user explicitly picks a language via `/api/user/language`). Useful signal, **not** authoritative for "all players in language X".
- `profiles.is_banned`, `ban_reason`, `banned_until` — reuse for defense-in-depth.

**Teacher role = the working precedent.** Scoped by `classrooms.language` / `vocabulary_lessons.language` via ownership + `SECURITY DEFINER` helpers (`is_classroom_owner`, migration 057). Copy this pattern exactly.

**Content systems (the curator's surface)**
- **Connections puzzles:** master `connections_puzzles` (id, locale, word1, bridge, word2, is_active, quality_score); daily pick `lib/connections/daily.ts` is a **pure fn of (date, locale)** off static materialized pools — does NOT consult reviews. Review table `connections_puzzle_reviews` is **service-role-only, advisory**, feeds `scripts/nightly/.../collect-flagged-puzzles.sh`. UGC: `connections_ugc_puzzles` (status pending/approved/rejected) + `connections_ugc_votes`.
- **Dictionary pipeline:** `invalid_word_submissions` (word, language, submission_count, reason, approved_at) → RPC `get_auto_promotion_candidates` / `record_invalid_word_submission`. Community votes `word_votes` → aggregated `word_scores` (`net_score` GENERATED, `is_potentially_valid = net_score >= 6`). Promotion writes via `backend/modules/wordPromotion.ts` `promoteWordToScores`. Hebrew has a separate `milog_status` verification track. In-memory dicts rehydrate from DB on load (`backend/dictionary.ts`).
- **Existing admin UI per-language:** `app/[locale]/admin/{dictionary,invalid-words,word-bank,milog-words,connections-review,moderation}/` — all gated by `isAdmin`. The curator UI **mirrors these, scoped + read/propose-only**.

**Players by language:** no single authoritative column. Combine `profiles.language` (explicit, partial) + `game_results.language` / `daily_puzzle_attempts.language` (behavioral) + `country_code` (geo proxy). → surface as **aggregates** only.

---

## 3. Data model

### 3.1 Assignments table (the source of truth)

```sql
CREATE TABLE public.curator_language_assignments (
  curator_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language     TEXT NOT NULL CHECK (language IN ('en','he','sv','ja','es')),
  active       BOOLEAN NOT NULL DEFAULT true,
  trust_tier   SMALLINT NOT NULL DEFAULT 1,   -- 1=read+propose, 2=word approve, 3=puzzle verdict+
  assigned_by  UUID REFERENCES auth.users(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_by   UUID REFERENCES auth.users(id),
  revoked_at   TIMESTAMPTZ,
  revoked_reason TEXT,
  notes        TEXT,
  PRIMARY KEY (curator_id, language)
);
CREATE INDEX idx_curator_lang_active ON public.curator_language_assignments (curator_id, language) WHERE active;
CREATE INDEX idx_curator_lang_by_lang ON public.curator_language_assignments (language) WHERE active;
ALTER TABLE public.curator_language_assignments ENABLE ROW LEVEL SECURITY;
-- NOT added to supabase_realtime (no consumer).
```

**Why a table, not `ALTER TYPE user_role ADD VALUE 'curator'`:**
- Additive — a curator is *also* a player/teacher/admin; the enum is a single mutually-exclusive slot.
- Multi-language — a he+en bilingual needs two rows; the enum can't express it.
- Revocation + audit free — `revoked_at` / `assigned_by` give time-boxing and provenance.
- Postgres footgun avoided — a newly-added enum value **cannot be used in the same transaction it's added in**, which Supabase migration wrapping bites on.

Role detection = "has ≥1 active assignment row." No new column on `profiles`. (Optional later: denormalize `profiles.curator_languages text[]` via trigger if the authz hot-path gets chatty.)

### 3.2 Proposal + audit tables (trust & safety spine)

```sql
-- Curator actions land here, NOT on master content. Append-only.
CREATE TABLE public.curator_proposals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curator_id   UUID NOT NULL REFERENCES auth.users(id),
  language     TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN
                 ('word_approve','word_reject','word_flag_invalid','puzzle_verdict')),
  target_ref   TEXT NOT NULL,            -- word, or puzzle_id
  payload      JSONB NOT NULL DEFAULT '{}',  -- verdict, note, reason, etc.
  status       TEXT NOT NULL DEFAULT 'proposed'
                 CHECK (status IN ('proposed','ratified','rejected','reverted')),
  ratified_by  UUID REFERENCES auth.users(id),
  ratified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_curator_proposals_lang_status ON public.curator_proposals (language, status);
CREATE INDEX idx_curator_proposals_curator ON public.curator_proposals (curator_id, created_at DESC);
```

A curator "approving" a word = a `curator_proposals` row, not a `word_scores` upsert. **Ratification** (admin button, or later: 2+ curators, or heuristic when player votes already high) applies the effect through the **existing** promotion path (`promoteWordToScores`) so all existing validators (offensive filter, milog, length, net_score) still run. Every applied action is reversible: "revert all by curator X since T."

### 3.3 RLS — one helper, no sprawl

```sql
CREATE OR REPLACE FUNCTION public.is_language_curator(p_language text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''                       -- Supabase advisor: pin search_path on definer fns
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.curator_language_assignments ca
    JOIN public.profiles p ON p.id = ca.curator_id
    WHERE ca.curator_id = auth.uid()
      AND ca.language   = p_language
      AND ca.active     = true
      AND p.is_banned   = false            -- defense in depth
  );
$$;
```

Then, on each scoped content table, **add** (never replace existing admin/service policies):

```sql
CREATE POLICY "curators read their language"
  ON public.invalid_word_submissions FOR SELECT
  USING (
    public.is_language_curator(invalid_word_submissions.language)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin=true)
  );
```

Tables touched (SELECT for v1): `invalid_word_submissions`, `word_scores`, `connections_puzzle_reviews`, `connections_puzzles` (their-locale), `curator_proposals` (own rows). Tables without a `language` column → serve via `SECURITY DEFINER` RPC returning aggregates.

> ⚠️ Do **not** add any of these to `supabase_realtime`. Curator dashboards poll / query on demand (see `.claude/rules/50-supabase-perf.md`).

---

## 4. Trust & safety

**Threat:** one rogue/compromised curator poisons the dictionary → every game in that language accepts garbage → leaderboards, longest-word, daily targets corrupted. Or a "bad" puzzle verdict hides good puzzles.

**Mitigations (layered):**
1. **Proposal-not-direct** writes (§3.2) — admin/pipeline ratifies before live effect. v1 has *no* direct master writes at all.
2. **Append-only audit** — `curator_proposals` + reuse existing `reviewed_by`/`approved_by`. Read-only history in both curator & admin UI.
3. **Existing validators always run** on ratification (offensive filter, milog for he, length, net_score).
4. **Scope ceiling** — curators never touch user bans, coins, accounts, infra, or other languages.
5. **Shadow-ban** — set `active=false` on the assignment; their proposals stay for audit but stop counting. Plus "pause all curators for lang X" + mass-revert tooling.
6. **Outlier detection** (cron / PostHog) — curator whose "later overturned" rate deviates → auto-flag + tier-down.
7. **Onboarding gate** — short application proving native fluency + sample reviews + signed ToS/CoC; 2FA recommended.

---

## 5. Agility — phased rollout

**Smallest valuable v1 (Phase 1): read + propose/flag. No master writes, no PII.**

### Phase 0 — foundation (no user-facing change, fully reversible)
- Migration: `curator_language_assignments` + `curator_proposals` + RLS + `is_language_curator()` / `get_my_curator_languages()` helpers (mirror teacher migration 057 exactly).
- `lib/auth/curatorAuth.ts` — `verifyCuratorAuth()` returning assigned languages or 403 (mirror `adminAuth.ts`).
- Frontend: `isCurator` + `curatorLanguages` in `useAuthState` / new `useCuratorStatus` hook.
- Regenerate `database.types.ts`; extend profile select lists.
- Admin assignment UI: `/admin/curators` (list high-activity natives per lang, assign/revoke w/ audit).
- TDD throughout (helper authz, proposal creation, RLS expectations).

### Phase 1 — v1 (read + propose; ships value immediately)
- `/[locale]/curator` route group (lighter mirror of `/admin`, gated `!isCurator && !isAdmin` → redirect; force to assigned language, tabs if multi).
- Read-only, language-scoped: pending invalid submissions (counts/reasons), `word_scores` health, Connections puzzles + player feedback stats.
- "Propose approve/reject/flag" + "puzzle verdict + note" → `curator_proposals` rows (no side effects).
- Activity overview = aggregates via RPC only (active players 7/30d, top submitted words, puzzle like/dislike rates). **No submitter PII.**
- Full `t('curator.*')` i18n × 5; **test Hebrew RTL** end-to-end.
- Recruit 1–2 curators per language, closed beta, heavy admin oversight.

### Phase 2 — narrow direct writes (after metrics prove quality)
- `trust_tier ≥ 2` curators get direct approve/reject on `invalid_word_submissions` for their language (still audited, still validated).
- Tier badges; "My curated words" impact view; admin curator-health panel; revert tooling.

### Phase 3+ — puzzle verdicts direct (scoped), curator-sourced content seeds, gamification, auto-promotion, public recognition.

**Quality metrics → tier-up:** per-curator `proposals_submitted`, `proposals_accepted`, `overturned_by_admin`, `player_reappeals_on_curated_words`, `tenure_days` → composite `accuracy_score`. Auto-suggest tier-2 after e.g. 30+ accepted, <5% overturned, 30d active. **Gamify accuracy, never volume** (volume → spam).

---

## 5b. Gamification — make it a *fun* role with bonuses

The curator role is a **game in itself**, with rewards plugged into systems we already have (`profiles.total_coins` / `emitCoinEarned`, `collectible_items` `badge`/`title` categories, streaks).

**Two axes, deliberately separate** (so grinding earns fun, never power):

| Axis | What it is | How earned | Effect |
|---|---|---|---|
| `trust_tier` (1–3) | **Capability** | Admin-granted, accuracy-suggested | Gates which writes are allowed |
| `curator_points` | **Prestige** | +points per **ratified** proposal (not on submit) | Rank title, badge cosmetic, coin bonuses |

**Points** (`lib/curator/curatorScope.ts` → `CURATOR_POINTS`): word_approve 10 · puzzle_verdict 8 · word_reject/flag 6. Awarded **only on ratification**, so spam earns nothing — the reward is intrinsically tied to being *right*.

**Rank ladder** (lexicography-themed, fast first win → long-tail prestige):
`Apprentice (0) → Scribe (50) → Lexicographer (200) → Wordsmith (600) → Loremaster (1500)`.
Each rank = an exclusive "Language Guardian" **badge + title** cosmetic (curator-only collectible line), shown on the public profile and nav.

**Coin bonuses** (`CURATOR_COIN_MILESTONES`, one-time on crossing): 50pts→100🪙 · 200→300 · 600→750 · 1500→2000. Redeemed into the existing coin economy via the ratify path (idempotent — `coinBonusForCrossing(prev,new)` pays each milestone once).

**Other fun hooks (phased):** daily-curation streak bonus (reuse streak system) · per-language "Top Guardians" seasonal leaderboard with reward chests · tier-up unlock moment (confetti + cosmetic + coin drop) · "your impact this month" recap ("142 words rescued · Hebrew invalid submissions down 18%").

> Anti-pattern guard (council): **gamify accuracy, never volume**. Points only on ratified-correct actions; a high "later-overturned" rate tiers a curator *down*. No payout for raw submission count.

## 6. Recruitment & motivation (community-mod lessons)

**Pick:** high-volume native players (query `game_results.language` + `country_code` + total_games/XP/streak) + power users who already submit feedback. **Invite, don't open-apply** at first (5–10 total).

**Motivate (status, not pay — Wikipedia "barnstar" model):**
- Profile flair: "Hebrew Curator • 142 words curated • 98% accepted".
- Opt-in "Language Guardians" hall-of-fame per language (monthly).
- "Dictionary updated by @user" in per-language patch notes.
- Private dev Discord channel; visible impact ("Hebrew invalid submissions down 18% this month").

**Pitfalls to avoid:**
- **Prescriptivism wars** (Hebrew formal vs. street, Spanish regionalisms, Japanese formality) → explicit **non-prescriptivist charter**: "modern player-facing standard; include common variants attested in ≥2 sources." Admin is final arbiter, not curators.
- **Volume-farming** → gamify accuracy.
- **Burnout / power creep** → trial period (first N proposals double-reviewed), graceful "emeritus" exit, strict scope.

---

## 7. What we're not forgetting

- **Audit everywhere** — append-only, no UPDATE/DELETE by non-service.
- **Abuse vectors** — compromised curator (revoke + mass-revert + force re-auth), collusion (cross-check proposals), spam (rate-limit per curator/lang), UI-breaking "valid" words (length caps).
- **Conflict resolution** — multi-curator langs show all flags with attribution + "dispute" → escalate to admin; single-curator langs → admin tiebreaker.
- **Localize the curator UI itself** — full `t()` × 5 incl. Hebrew RTL (shadows auto-flip; test `?locale=he`). A native reviewer in a broken LTR layout is the worst onboarding.
- **Privacy / PII** — curators see word submissions (already semi-public to admins) but **not** email/IP; player overview is aggregate-only. Document in privacy policy (EU/EEA now in scope).
- **Japanese specifics** — curator UI must show reading (furigana/kana) alongside kanji, not just the surface word.
- **Performance** — index assignments; helper `STABLE`; aggregate player overview via materialized view / nightly rollup if `game_results` scans get hot.

---

## 8. Council vs. our decision (where we diverged)

- Both Gemini & Grok suggested *also* extending the `user_role` enum. **We declined** (advisor): the assignments table fully expresses the role; an enum value is redundant, can't be multi-language, and hits the same-transaction enum footgun. One source of truth.
- Gemini's "curator vote = weight 6" is elegant but **is a direct write**. We route through proposals in v1 for zero blast radius; the weight idea is a good *Phase 2* mechanism once trust is proven.
- Consensus we kept: `SECURITY DEFINER is_language_curator()` helper, proposal queue + audit, tiered trust, accuracy-over-volume gamification, invite-only closed beta, non-prescriptivist charter.

---

## 9. Implementation status

**Phase 0 — BUILT (file-only, not applied to prod, not committed):**
- `supabase/migrations/20260605180000_language_curator_role.sql` — `curator_language_assignments` + `curator_proposals` (with gamification columns `curator_points`, `points_awarded`, `reward_granted`) + helpers `is_language_curator()` / `get_my_curator_languages()` / `is_admin_user()` + RLS. **Inert on apply** (no curators → helper false for all). Column refs verified against live schema. NOT in `supabase_realtime`.
- `lib/curator/curatorScope.ts` — pure scope + gamification helpers (access, points, rank ladder, coin milestones). 18 tests.
- `lib/auth/curatorAuth.ts` — `verifyCuratorAuth(req, {language?})` server gate (Bearer/cookie, admin bypass, language scoping, tier). 10 tests.
- ✅ 28/28 TS tests green · tsc-clean · eslint-clean.
- ✅ **Migration empirically validated in real Postgres** (`BEGIN…ROLLBACK`, nothing persisted): DDL/PL-pgSQL parses + applies; and as the `authenticated` role with RLS enforced, a he-curator sees he rows in `invalid_word_submissions` (1) and is blocked from en rows (0); `is_language_curator('en')` is false (inert mechanism); `get_my_curator_languages()` → `["he"]`.
- **Trust-model fix (advisor):** puzzle verdicts go through `curator_proposals` (kind=`puzzle_verdict`) only — the direct curator INSERT into `connections_puzzle_reviews` was dropped, so a rogue curator can't mass-flag good puzzles `bad` and drive nightly-improvement churn. Curators only ever INSERT into `curator_proposals`; one uniform path. Curators retain SELECT on reviews.

**Next — Phase 1 (UI):** `useCuratorStatus` hook (fetch active assignments) + `isCurator`/`curatorLanguages` in auth context · admin `/admin/curators` assign/revoke UI · `/[locale]/curator` route (read + propose) · `t('curator.*')` ×5 incl. Hebrew RTL · curator rank/coin reward UI. Then apply the migration to prod (reviewed) and invite the first curators.
