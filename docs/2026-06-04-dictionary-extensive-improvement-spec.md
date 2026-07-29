# Extensive, Self-Improving Multilingual Dictionaries — Spec

**Date:** 2026-06-04
**Status:** Spec → implementation (this session)
**Owner:** autonomous (founder-reviewed)
**Inputs:** `/claude-council:ask` (gemini + grok), advisor review, live Supabase state, repo map.

---

## 1. Problem & live reality

LexiClash validates words against per-language in-memory `Set`s (en ~417k, he ~351k, es ~636k, sv ~33k, ja ~13.5k hiragana). A **reactive** self-improvement pipeline already exists: rejected player submissions → `invalid_word_submissions` → verified against language authorities (Wiktionary en/es/sv, milog he, Jisho ja) → auto-promoted to `word_scores` (cron every 4h) → slurs demoted (healing cron 03:30 UTC).

Live Supabase snapshot (2026-06-04):

| lang | invalid_word_submissions | auto-promoted | word_scores valid | state |
|---|---|---|---|---|
| he | 1463 | 1113 | 159 | milog thriving |
| en | 345 | 10 | 18 | verifier runs, strict |
| sv | 28 | 0 | 2 | starved queue |
| ja | 12 | 0 | 1 | starved queue |
| es | 17 | 0 | 0 | starved queue |

**Root cause of weak coverage:** the pipeline is *reactive* — it can only ever verify a word a player already typed-and-got-rejected. The es/ja/sv verifiers are correctly wired (`wordVerificationRunner.LANGS = ['en','es','sv','ja']`) but the **input queue is starved** (12–28 rows). With 12 Japanese submissions ever, no verifier can move a 13.5k dictionary. Hebrew thrives only because Hebrew players are active *and* milog is permissive.

**Conclusion:** "improve extensively" cannot come from the reactive layer. It must come from a **proactive candidate-injection layer** + an **LLM-judged deep pass**, both of which FEED the existing verify→promote→heal gates (never bypass them).

## 2. Goals / non-goals

**Goals**
- Make each dictionary **more complete** (fewer false-rejects of real words) and **more correct** (fewer false-accepts of garbage), per language, with focus on the weak ones (ja, sv, es; en promotion velocity).
- Make improvement **proactive** — discover missing real words and audit accepted garbage without waiting for players.
- Make it **auto-improve over time** — a sustainable, bounded, gated loop where quality monotonically increases (no drift / regressions).
- Deliver a reusable **multi-agent Workflow** (`.claude/workflows/dictionary-improvement.js`) for deep, on-demand extensive passes.

**Non-goals (this iteration)**
- Multi-word / phrase support.
- Rewriting the base dictionaries (npm packages stay; we add an `_approved`/`word_scores` overlay).
- Definitions/glosses surfaced in-game (data captured opportunistically; UX later).
- Frequency-weighted *scoring* of gameplay (separate ticket; we use frequency only for candidate prioritization here).

## 3. Architecture — two execution tiers

Both tiers share **pure, unit-tested logic** in `backend/modules/dictionaryImprovement/` and both terminate at the **existing gates** (`verifyWordOn*`, `isOffensiveWord`, `promoteWordToScores`, healing).

```
                ┌──────────── candidate sources ────────────┐
 frequency lists / authoritative lexicons / LLM generation  │
 (backend/dictionary/candidates/<lang>.txt, + Workflow agents)
                └───────────────────┬───────────────────────┘
                                    │ prioritizeCandidates() — novel, freq-ranked, bounded
                                    ▼
                       invalid_word_submissions  (verification_source='proactive')
                                    │
   ┌────────────────────────────────┴─────────────── EXISTING GATES (reused) ───────────┐
   │ verifyWordOnWiktionaryEn/Es / verifyWordOnWiktionary(sv) / verifyWordOnJisho / Milog │
   │ → isOffensiveWord() → promoteWordToScores()  (auto-promotion cron, every 4h)         │
   │ → dictionary healing (demote slurs, 03:30 UTC)                                       │
   └──────────────────────────────────────────────────────────────────────────────────┘
                                    │
                          word_scores (is_potentially_valid) → in-memory community cache
                                    │
                    auditSampler() re-verifies a stratified sample → flags garbage → healing
                                    │
                    qualityMetrics() recall@gold / precision@sample → dictionary_quality_metrics
                                    │
                          qualityGate(): refuse to promote a batch if precision regresses
```

### Tier 1 — Runtime backend crons (always-on, write to DB)
Node-cron in the Express backend (`services/cronScheduler.ts`). New jobs:
- **`proactive-discovery`** (daily, rotating weak language): load `candidates/<lang>.txt`, `prioritizeCandidates` (drop words already known / already queued), insert a **bounded** batch (default 200) into `invalid_word_submissions` with `verification_source='proactive'`. The existing verification + auto-promotion crons then process them — no new verify/promote code.
- **`dictionary-metrics`** (daily): `computeRecall` vs gold sets + `precision` from a re-verified audit sample → upsert `dictionary_quality_metrics`. Feeds the SLA dashboard and the `qualityGate`.
- **`dictionary-audit`** (weekly): `selectAuditSample` of currently-valid words → re-verify strictly → flag false-accepts for the healing path.

### Tier 2 — Nightly autonomous Workflow (deep, on-demand, commits files + DB)
- **Workflow** `.claude/workflows/dictionary-improvement.js`: a deterministic multi-agent pipeline (DISCOVER → GATE → JUDGE → AUDIT → REPORT) that fans out LLM subagents to (a) **generate** candidate words for the night's target language (writing/extending `candidates/<lang>.txt`), (b) **LLM-judge** the ambiguous tail that deterministic verifiers can't settle (neologisms, slang, compounds) via a dual-judge ensemble, (c) **audit** a sample for garbage, (d) emit a metrics + provenance **report**. It persists candidate files (committed) and a report; the deterministic verify/promote stays in Tier 1.
- **Nightly lane 10** (`scripts/nightly/lanes/10-dictionary.sh` + `prompts/10-dictionary.md`): each night runs the bounded discovery for the rotating target language and invokes the Workflow for a deep pass, gated by the nightly lint/test/build gate, auto-committed.

**Why split:** the Claude Workflow engine is one-shot per session and ideal for *generation + judgment* (where LLMs add real value); deterministic *verification + promotion + healing* belongs in the always-on cron (cheap, precise, network-cached). Each lands where it is strongest. The candidate files are the durable hand-off between the two tiers.

## 4. Where LLM judges add value vs. deterministic sources (council consensus)
- **Deterministic, strictly better/cheaper (do first):** exact dictionary membership, Wiktionary/Jisho/milog lookups (cached), offensive-label parsing, frequency-floor checks, morphology from static lists. These settle the overwhelming majority.
- **LLM ensemble (the ambiguous tail only):** neologisms/slang (`rizz`, wasei-eigo), compound validity (sv productivity, he smichut), and **candidate generation** where no corpus is bundled. Use a **dual-judge** (two providers/models, as the Connections pool builder proved): promote only if both return valid AND confidence ≥ 0.75 AND a deterministic signal does not reject.
- **Ensemble voting:** deterministic verdict = 2 votes, each LLM judge = 1 vote; promote at score ≥ 3, reject at deterministic-reject or score ≤ 1, else `review`. Implemented in `ensembleVerdict()` (pure, tested).

> History warns this is essential: Connections pools were 225/336 broken (en) and ~50–72% bad (council Swedish) when LLM output went in unjudged. Garbage must clear deterministic + dual-LLM + offensive gates before it touches a live validation set.

## 5. Per-language plan (council, prioritized by leverage)
- **Japanese (highest leverage):** parse JMdict reading elements (`reb`) to expand the hiragana validation set far beyond 13.5k (target ~150k readings of common entries). Validation set stays **pure hiragana** (correct for boards); kanji only seeds boards. Prioritize entries tagged `news1/ichi1/spec1`. Authority: Jisho/JMdict. Normalization: none (hiragana only).
- **Swedish:** current 33k base is the problem. Source candidates from Språkbanken/SAOL/SALDO (frequency + compounds). Compound splitter for productivity. Authority: Wiktionary sv. Normalization: lowercase.
- **Spanish:** add full inflection/conjugation candidate lists; **critical**: accent-strip on BOTH load and lookup (`normalizeSpanishWord`) so an accented promoted word is never a permanent ghost vs a stripped lookup; preserve ñ. Authority: Wiktionary es.
- **English:** coverage is fine; promotion velocity is the issue. Prioritize candidates by frequency (high-freq, low-length words are starved by the reactive long tail). Datamuse `f` tag already used in repo scripts. Strict on proper nouns. Authority: Wiktionary en.
- **Hebrew:** keep the thriving milog path. Add root+pattern (binyan/mishkal) candidate generation from high-frequency seeds, freq/LLM-filtered. Normalization: sofit fold + niqqud strip (`normalizeHebrewWord`), idempotent at load + validate.

## 6. Auto-improve-over-time loop (monotonic, no drift)
- **Gold eval sets** (prerequisite, not optional): `backend/dictionary/gold/gold_valid_<lang>.txt` + `gold_invalid_<lang>.txt` — small, hand-curated, obviously-correct known-valid and known-garbage words per language. Seeded this session (~20–40 each); expandable.
- **Metrics** (`dictionary_quality_metrics` table): per lang per run — `recall_at_gold` (% gold-valid present), `precision_sample` (% of a re-verified accepted sample that holds), `false_reject_rate`, `promotion_velocity`, `garbage_flagged`. Cheap to compute.
- **qualityGate:** a discovery/promotion batch is refused (and alerted) if `precision_sample` would regress beyond a tolerance vs the trailing baseline. Makes "auto" safe and the word defensible.
- **Bounded & incremental:** never re-audit 636k words nightly. Process a prioritized batch per run; rotate the target language. Caps logged (no silent truncation).
- **Human-in-the-loop:** Telegram alert on (a) precision regression, (b) any healing wave > N demotions, (c) gold-set recall drop. Founder can veto via the existing directive channel.
- **Rollback:** additions are reversible via the existing `is_potentially_valid=false` / `rejected_at` flags + healing demotion + git revert of committed candidate files. Removals stay conservative (only on deterministic reject + offensive, never on a single LLM vote).

## 7. Data model
- New table `dictionary_quality_metrics` (migration): `id, language, measured_at, dict_size, recall_at_gold numeric, precision_sample numeric, false_reject_rate numeric, promotion_velocity int, garbage_flagged int, gold_valid_n int, gold_invalid_n int, notes text`. 1-year TTL via existing audit-cleanup convention.
- Reuse `invalid_word_submissions.verification_source` with value `'proactive'` for injected candidates (no schema change for provenance).
- **Verified enqueue contract** (against live `get_verification_queue`, 2026-06-04): proactive rows MUST set `verification_status='pending'`, `submission_count=2`, `verification_attempts=0` (the queue filters `status IN ('pending','error') AND submission_count>=2 AND verification_attempts<3`; a `NULL` on either integer column fails the predicate). Hebrew is excluded from that queue (`language != 'he'`) — `he` proactive rows additionally set `milog_status='pending'` for the milog enrichment path. A unique index `unique_invalid_word_language (word,language)` backs the dedup upsert. Proven end-to-end: 8 sv rows inserted → queue-selectable=8.
- Candidate files: `fe-next/backend/dictionary/candidates/<lang>.txt` (committed, one word/line, `#` comments).
- Gold files: `fe-next/backend/dictionary/gold/gold_{valid,invalid}_<lang>.txt`.

## 8. Safety
The dictionary is the **live gameplay validation set**. Accepting garbage and rejecting real words are both user-facing and hard to reverse mid-game. Therefore:
- **Additions** pass: novelty + frequency floor + deterministic authority verify + offensive filter + (for the ambiguous tail) dual-LLM ensemble. Bounded per run. Gated by `qualityGate`.
- **Removals** stay conservative: only via the existing healing path (deterministic reject + offensive label), never on one LLM vote; cooldown after demote to prevent oscillation.
- All proactive writes carry `verification_source='proactive'` so they are auditable and revertible.

## 9. Testing (TDD)
Pure functions unit-tested first (RED→GREEN→REFACTOR), vitest, in `backend/modules/dictionaryImprovement/__tests__/`:
- `prioritizeCandidates` — novelty dedup, freq ordering, bound, normalization.
- `ensembleVerdict` — weighted voting thresholds, deterministic override, offensive hard-block.
- `qualityMetrics` — recall/precision math, `qualityGate` regression refusal.
- `auditSampler` — deterministic stratified sampling (seeded), strata coverage.
- Orchestrators (`proactiveDiscovery`, metrics job) tested with **injected deps** (no real DB/network).
The Workflow JS script and the nightly shell lane are not vitest-testable; their *logic* lives in the tested modules they call.

## 10. Rollout phases (this session)
1. Spec + plan (docs).
2. Gold eval sets + candidate seed lists (per language, conservative).
3. TDD pure modules (`dictionaryImprovement/`).
4. Thin orchestrators (proactive discovery, metrics) with mocked-dep tests.
5. Migration: `dictionary_quality_metrics`.
6. Cron wiring (proactive-discovery rotation, dictionary-metrics, weekly audit).
7. The multi-agent Workflow `.claude/workflows/dictionary-improvement.js`.
8. Nightly lane 10 (shell + prompt) + add to `LANES` array.
9. Validate (lint + test + build, scoped) → commit per phase (ask first).

## 11. Open items / future
- JMdict full parse + SALDO ingestion (large; mechanism shipped, corpora to be dropped in incrementally).
- Frequency-weighted gameplay scoring.
- Glosses surfaced in-game.
- Distinct-submitter signal already in healing; extend to proactive precision audit.
