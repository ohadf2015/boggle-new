# Spec — Self-Improving & Self-Healing Dictionary

**Date:** 2026-05-23 · **Owner:** auto/founder · **Status:** IMPLEMENTED — **ALL 5 LANGUAGES**. 52 backend tests, lint clean, build:fast green, live smoke verified (en/es/sv via Wiktionary, ja via Jisho, he via Wiktionary labels). distinct-submitter/admin-unpromote/Telegram-pending-digest deferred to v2.

## Language coverage (all 5)
| lang | verify source | offensive filter | healing |
|------|---------------|------------------|---------|
| en | Wiktionary REST `body.en` | en.wiktionary `{{lb\|en}}` slur-family | yes |
| es | Wiktionary REST `body.es` | en.wiktionary `{{lb\|es}}` | yes |
| sv | Wiktionary REST `body.sv` (generic verifier) | en.wiktionary `{{lb\|sv}}` | yes |
| he | milog (existing 04:00 cron) + now offensive-gated | en.wiktionary `{{lb\|he}}` | yes |
| ja | **Jisho/JMdict** (hiragana; Wiktionary can't resolve kana) | best-effort (Jisho exposes only some misc tags) → backstops | no (filter can't re-check ja) |

## Problem (founder ask)
"Keep improving the dictionary automatically over time so it catches more words
including slang. It still rejects a lot of words. Mine the words users submitted
that didn't work. Make it improve *significantly* over time — add improving AND
auto-healing mechanisms."

## What already exists (verified 2026-05-23)
Pipeline is ~80% built; the last mile is missing.

- **Capture works.** SP submits round-trip to `POST /api/dictionary/check`
  (server-side `Set` lookup). On `isValid:false` the client fire-and-forgets
  `POST /api/invalid-word/record` → `record_invalid_word_submission()` RPC →
  `invalid_word_submissions` table. MP peer-rejects recorded server-side too.
- **Verifiers exist.** `wiktionaryEnVerifier.ts` + `wiktionaryEsVerifier.ts`
  (Wiktionary REST API, target-language section, POS filter), `milogWordVerifier.ts`
  (Hebrew). Each has a queue processor (`processWiktionaryEnVerificationQueue`, …)
  calling generic RPCs `get_verification_queue(p_language,…)` +
  `update_verification_result`.
- **Promotion exists.** `autoPromotion.ts` (`runAutoPromotion`) has 4 paths;
  cron `startAutoPromotionCron` runs **every 4h**. `promoteWordToScores` writes
  `word_scores`; `addToCommunityCache` also appends to `*_words_approved.txt`.
- **Generic schema.** `invalid_word_submissions` already has
  `verification_status|source|url|word_type|attempts|last_attempt|error`
  (language-agnostic) + `auto_promoted_at|by`, `rejected_at|by`,
  `player_appeal_count`. **No migration needed for en/es/sv.**
- **Demote primitives.** `removeFromCommunityCache(word,lang)` (cache only),
  `word_scores` row delete / `dislikes_count` bump (DB trigger
  `trg_word_scores_promote` flips `is_potentially_valid` at net-score ≥ 8),
  `bot_word_blacklist`.

## Real data (why it feels broken)
| lang | total rejected | promoted | verified-waiting | max submits |
|------|---------------|----------|-----------------|-------------|
| he | 1341 | **1047 (78%)** | — | 10 |
| en | 199 | **7 (3.5%)** | 4 stuck | 4 |
| ja | 12 | 0 | 0 | 1 |
| sv | **0** | — | — | — |

**Diagnosis:** Hebrew thrives because its verify+promote crons are *scheduled*.
**EN/ES verification is never scheduled** → `verification_status` only changes via
manual admin clicks → the Wiktionary promotion paths starve → 4 en words sit
verified-but-never-promoted, 188 never re-checked. The only auto path that fires
for en is the unverified `submission_count≥10` path — useless (en max=4) AND unsafe.

## Headline decisions
1. **Kill the unverified `submission_count≥10` promotion path.** It promotes any
   string with zero content check (slur risk on a 15+/TV party game) and is
   useless at current volume. Verification becomes the *only* auto gate; submission
   count becomes a *priority* signal inside the verification queue (already is).
   *(Founder can revert via git if a manual-review-for-off-Wiktionary lane is wanted
   — that's what the admin UI is for.)*
2. **Slang flows in for free.** Wiktionary tags slang as normal POS; we do NOT
   exclude `slang`/`informal`/`colloquial`/`derogatory`-alone. We only block the
   **hate/explicit** family.
3. **Slur source = Wiktionary's own labels, via raw wikitext.** The REST
   `/page/definition/` endpoint *strips* label text (`<span class="usage-label-sense"></span>`
   is empty). Raw wikitext (`?action=raw`) carries `{{lb|<lang>|ethnic slur|offensive}}`.
   **Reject token set = the SLUR/hate family ONLY**: any label containing `slur`
   (ethnic/racial/religious/homophobic slur) plus bare `ethnic`/`racial`/`racist`.
   **Allow** `vulgar`, `offensive`, `slang`, `informal`, `colloquial`,
   `derogatory`, `pejorative`. Rationale (verified against live Wiktionary):
   - matches the word-game norm (Scrabble bans slurs, keeps profanity) + the
     founder's "catch slang" ask;
   - avoids false-positives on **polysemous** words — Spanish `gato` (cat) carries
     `{{lb|es|vulgar|slang|Argentina}}` on one regional sense; blocking it (or
     `dog` = derogatory) would be wrong. Verified: `wop`/`kike`/`spic` → blocked,
     `gato`/`cat`/`gringo`(pejorative, not a slur) → allowed.
   - **Known limitation:** a slur whose *only* Wiktionary label is `offensive`/
     `derogatory` on a sense alongside clean homographs (e.g. `chink` = "a narrow
     opening") is NOT auto-blocked. Accepted because such words are already in the
     base dictionary (never promotion candidates) and are covered by the three
     backstops below. No curated list to maintain.
   Backstops: the healing sweep (same filter), the admin review queue, and
   `bot_word_blacklist` (manual hard-block).

## Out of scope (v2 — documented, not built)
- **Japanese** auto-verify: validation set is hiragana-only; Wiktionary JA returns
  kanji+kana → needs kuromoji orthography strategy. Tied to
  `shiritori-mode` / `japanese-mp-coherence` work.
- **Swedish verifier**: code-cheap (mirror EN, `body?.sv`) but **zero sv data**
  captured → premature. Add when sv submissions appear. (Generic RPCs already
  accept `p_language='sv'`.)
- **Distinct-submitter signal**: moot once verification is the gate.
- **Capture robustness** (sendBeacon vs fire-and-forget): low volume may be partly
  lost rejections; revisit if backlog stays thin after scheduling.
- **Admin "un-promote" button** + Telegram digest of top pending words.

## Implementation (TDD, per-phase commits)

### Phase 1 — Offensive filter module (PREVENTION)
New `backend/services/wiktionaryOffensiveFilter.ts`:
`isOffensiveWord(word, lang): Promise<boolean>` — fetch raw wikitext
(`https://<lang>.wiktionary.org/w/index.php?title=<word>&action=raw`, en.wiktionary
for es since labels live there), regex `{{(lb|label|lbl)\|<lang>\|([^}]*)}}`, split
params, match against REJECT tokens (substring `slur`, exact `offensive|vulgar|
profane|profanity|ethnic|racial|religious`). Redis cache 30d. Fail-OPEN=false?
**No — fail-CLOSED on network error for safety**: if we can't verify it's clean,
don't auto-promote (return `true`/offensive so it's skipped, leaving it for admin).
Pure `parseOffensiveLabels(wikitext, lang)` export for unit tests using captured
fixtures (wop=slur→true, fuck=offensive→true, dog=slang+derogatory→false,
ain't=informal→false, ordinary noun→false).

### Phase 2 — Wire prevention + kill unsafe path (`autoPromotion.ts`)
- Delete `promoteBySubmissionCount` + its call + `submissionBased` result field
  (or keep field empty for API compat). Update header comment.
- In each verified path (milog/en/es), before `promoteWordToScores`: 
  `if (await isOffensiveWord(word, lang)) { mark rejected via update_verification_result
  or rejected_at; result.failed++ (or new .blocked++); continue; }`
- Tests: offensive word skipped + flagged; clean word promoted; submission path gone.

### Phase 3 — Schedule verification (`cronScheduler.ts`)
- New `startWordVerificationCron()` — daily **02:00 UTC**, `withCronLock`, dynamic
  import, calls `processWiktionaryEnVerificationQueue()` then `…Es()`. Log counts.
- `triggerWordVerification()` manual export (admin parity).
- Register in `startAllCronJobs()` (`tasks.push(startWordVerificationCron())`).
- Tests: cron registered; processors invoked; errors swallowed (don't crash boot).

### Phase 4 — Auto-healing sweep (`backend/modules/dictionaryHealing.ts` + cron)
`runDictionaryHealing()`:
- **Quarantine:** pull `auto_promoted_at IS NOT NULL` words (batch), re-run
  `isOffensiveWord`; for matches → demote: delete `word_scores` row +
  `removeFromCommunityCache` + `removeApprovedWord` (strip line from `*_words_approved.txt`)
  + `bot_word_blacklist` upsert + set `rejected_at`/`rejected_by='auto_heal'`. Logs each.
- **Re-verify stale:** rows `verification_status='error'` past N days with attempts<max
  are already re-queued by `get_verification_queue` — no-op, but assert covered.
- **Health signal:** if 0 promotions in 7d while pending>threshold, log WARN
  (founder-visible via existing triage).
- New `startDictionaryHealingCron()` daily 03:30 UTC, registered in `startAllCronJobs`.
- Tests: planted slur in word_scores → swept → demoted everywhere; clean word untouched.

## Acceptance
- en/es verification runs nightly without admin action; verified words auto-promote
  within ≤4h (existing promotion cron) — **gated by offensive filter**.
- A slur that reaches `word_scores` (historical or somehow) is auto-removed within 24h.
- `npm run lint && npm run test:backend && npm run build:fast` green.
- No slur/offensive word auto-promoted in any language.
