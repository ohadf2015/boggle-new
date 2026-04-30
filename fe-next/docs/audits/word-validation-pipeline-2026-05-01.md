# Word Validation & Dictionary Pipeline Audit — 2026-05-01

End-to-end audit of word submission → validation → moderation → canon-promotion pipeline. Hebrew has Milog verifier; other locales lack any external truth signal. User asks for stricter weirdness/abbrev rejection and per-language sophistication.

**Modules**
- Entry: `backend/handlers/wordHandler.ts` (`submitWord` socket event)
- Validation: `backend/dictionary.ts`, `backend/dictionaryLoaders.ts`
- Community: `backend/modules/communityWordManager.ts`, `backend/modules/communityWordHybridValidation.ts`
- Hebrew verifier: `backend/services/milogWordVerifier.ts`
- Rejection log: `backend/modules/supabase/words.ts:214` (`recordPlayerWrongWord`)
- Approval flow: `backend/modules/supabase/words.ts:31` (`saveHostApprovedWord`), `backend/modules/dictionaryEnrichment.ts`
- Schema: migrations `053_invalid_word_submissions.sql`, `004_community_words.sql`, `20260205100000_milog_*`
- Admin: `backend/routes/admin/invalidWordRoutes.ts`, `app/api/admin/milog-words/route.ts`

---

## CRIT (correctness / dictionary integrity)

### C1 — Promotion threshold trivially gameable; user wants stricter
- **Where:** `communityWordManager.ts:38-40` (`AI_VOTE_POINTS=4`, `PROMINENT_THRESHOLD=6`, `VALID_THRESHOLD=0`)
- **Issue:** AI yes (+4) plus 2 player likes (+2) = 6 → promoted permanently. Two friends + a permissive AI promote any string. No collusion guard, no minimum distinct authed voters, no Milog gate for `he`. User explicitly asked: "don't accept too weird words or abbrev".
- **Fix:**
  1. Per-language promotion gate: for `he`, require `milog.status='verified'` before `addToCommunityCache`. Plug into `recordAIVote` and `recordVote` — if `is_potentially_valid` would flip but Milog is missing/`rejected_type`, defer instead of promote.
  2. Require ≥3 distinct authed user votes (not guests) on top of net-score. Add `distinct_voter_count` view over `word_votes` filtered to `user_id IS NOT NULL`.
  3. Bump `PROMINENT_THRESHOLD` to 8 OR weight authed votes 2x (`is_authed = user_id IS NOT NULL ? 2 : 1`).
  4. AI vote alone must NOT exceed half the threshold — enforce `min_human_votes = 2` independent of AI score.

### C2 — No pre-submission weirdness/abbreviation filter
- **Where:** `wordHandler.ts:248-271` (length cap + min-length only); no shape heuristic anywhere.
- **Issue:** Strings like `XXX`, `aaaaaaaaa`, `qz`, `USA`, `wtf` flow into `invalid_word_submissions`, pollute the voting queue, and waste Milog quota. User specifically called out abbreviations.
- **Fix:** Add `shared/utils/wordShapeFilter.ts` with cheap rejectors (run BEFORE on-board check, BEFORE recording rejection):
  - `length > 15` → reject (boards max 5×5 = 25; 15+ is junk)
  - `repeated-char-run > 3` (`/(.)\1{3,}/`) → reject
  - All-uppercase ASCII original input + ≤4 chars → likely abbreviation (only for `en/sv/es`, normalize AFTER this check)
  - Per-language vowel/consonant ratio: en/sv/es require ≥1 vowel for len≥3; he/ja skip (different writing systems)
  - Contains digit/punct/non-letter (already implicit but make explicit)
- Reject these CLIENT-SIDE too in `submitWord` flow (`SubmitWordPayload` zod schema) so they never hit the server queue. Backend keeps the same filter as defense-in-depth.

### C3 — `addApprovedWord` file write is ephemeral on Railway, masks DB as source of truth
- **Where:** `dictionary.ts:447-449` (`fsp.appendFile(approvedFilePath, ...)`)
- **Issue:** Railway containers have ephemeral FS; runtime appends to `*_approved.txt` are lost on every redeploy. `dictionaryLoaders.ts:59,70,92,140,189` DO read these files at boot — but only the committed snapshot. Real persistence is `loadCommunityWords()` rehydrating from `word_scores.is_potentially_valid=true` (`communityWordManager.ts:59`). The file write is dead between deploys; it can also racily diverge from DB.
- **Fix:** Pick one:
  - **(preferred)** Drop file append in `addApprovedWord`; rely entirely on DB rehydrate. Remove `*_approved.txt` reads from `dictionaryLoaders.ts` to eliminate dual-source confusion. Keep one `english_words_approved.txt` only as the npm-package augment baseline, rename it `english_words_baseline.txt` for clarity.
  - **(if files must stay)** Move appends through a periodic batch dump (cron) that snapshots DB → file and commits via repo bot. Don't write per-approval at runtime.
- Verify: `hebrew_words_approved.txt` is currently 0 lines committed but Hebrew approvals exist — proves the file path is unused-in-practice.

---

## HIGH (per-language sophistication)

### H1 — No external verifier for `en`, `es`, `sv`, `ja`
- **Where:** Only `milogWordVerifier.ts` exists. `invalid_word_submissions` for non-Hebrew is logged but never auto-verified.
- **Issue:** Pipeline has Hebrew asymmetry. User asked for "sophisticated method" per language.
- **Fix:** Generalize `milogWordVerifier.ts` to a `DictionaryVerifier` interface:
  ```
  interface DictionaryVerifier {
    language: Language;
    verify(word: string): Promise<VerificationResult>;
    rateLimitMs: number;
  }
  ```
  Then add adapters incrementally (don't ship all at once):
  - **en**: Wiktionary REST `https://en.wiktionary.org/api/rest_v1/page/definition/{word}` — free, no key, returns 404 for non-words. Reject if any sense has `partOfSpeech: "Abbreviation"` or `"Proper noun"`.
  - **es**: Wiktionary `es.wiktionary.org` same shape; reject `Sigla` (abbreviation), `Nombre propio`.
  - **sv**: Wiktionary `sv.wiktionary.org` — smaller corpus, fall back to SAOL via scraped HTML if 404.
  - **ja**: JMdict file (likely already the dict source — verify in `loadJapaneseDictionary`); for non-dict submissions cross-check against `jisho.org` API. Reject `n-pr` (proper noun) tags.
- Reuse Milog's pattern: 7-day Redis cache, queue table (`*_verification_status` columns mirroring `milog_*`), processed by cron, results gate promotion.
- **Phase plan:** ship `en` first (highest volume), then `es`, then `sv`, then `ja`. Each is ~150 LOC.

### H2 — `invalid_word_submissions` not mined for non-Hebrew enrichment
- **Where:** `053_invalid_word_submissions.sql` schema has `submission_count`, `language`. Milog cron (`processMilogVerificationQueue`) consumes only `language='he'`.
- **Issue:** A word submitted 50+ times across 30 distinct users in `en` is almost certainly missing-from-dictionary, not garbage. No path promotes those.
- **Fix:** Generalize cron to `processVerificationQueue(lang)` that:
  1. Pulls rows where `submission_count >= N` AND `language = lang` AND `verification_status IS NULL`
  2. Runs the language's `DictionaryVerifier`
  3. On `verified` + (passes weirdness filter from C2) → upserts `word_scores` with `aiApproved=true` and bumps to `is_potentially_valid=true` (or queues for human review depending on confidence).
  4. On `rejected_type` (abbrev/proper-noun) → mark in DB so it never re-enters queue.
- N threshold: start at `submission_count >= 5 AND distinct_users >= 3`.

### H3 — Milog "permissive fallback" can leak weird words
- **Where:** `milogWordVerifier.ts:164-167` — `verified: true, wordType: 'unknown'` when links exist but no type parsed.
- **Issue:** Milog HTML changes break type extraction → silent permissive promotion. Today's fallback says "Milog has SOME page → trust it". For abbreviations Milog DOES have pages (rejected via type label) but if the label parser fails, abbrevs leak in.
- **Fix:** Flip default — on `wordType: 'unknown'`, return `status: 'needs_review'` (new enum value), park in admin queue, do NOT promote. Add a parser-health metric: alert if `unknown` rate exceeds 5% of verifications.

### H4 — Profanity list is the only content gate; no slur/spam list per locale
- **Where:** `wordHandler.ts:251` `isProfane(normalizedWord)` — single source likely English-leaning.
- **Issue:** Hebrew/Spanish slurs may pass; non-slur garbage (`xxxxxxx`, `lolwut`) only blocked by C2 if shipped. No locale-specific block list.
- **Fix:** Per-language `blocklist_<lang>.txt` loaded into `Set<string>` at boot, checked alongside profanity. Keep small (<200 entries each). Tie into `invalid_word_submissions` reason enum: add `'blocklisted'`.

---

## MEDIUM

### M1 — `recordPlayerWrongWord` buffer can drop on crash
- **Where:** `backend/modules/supabase/words.ts:214-240` — 5s flush or 20-word batch, in-memory only.
- **Issue:** Server SIGKILL between flushes loses the rejection signal. Loss < ~5s of submissions but still skews `submission_count` for the C1 weighted-vote scheme.
- **Fix:** On `SIGTERM`/`beforeExit` flush synchronously. Already common pattern — confirm wired in `server/lifecycle.ts`. If not, add ~10 LOC.

### M2 — No analytics on rejection-reason distribution
- **Where:** Rejections fire `wordRejected`/`wordNotOnBoard`/`wordTooShort`/`wordRejectedByPeers` events client-side; only `inc('wordNotOnBoard')` counter exists server-side.
- **Issue:** Can't answer "what % of submissions are abbreviations vs misspellings vs typos vs valid-but-missing-from-dict?" — required to tune C2 thresholds and prioritize H1 verifier rollout.
- **Fix:** Posthog event `word_rejected` with `reason`, `language`, `length`, `was_on_board`, `submission_count_global` (lookup in Redis). Sample to 10% to keep volume sane. Build a Sigma/Posthog board over 14 days before tuning C1 numbers.

### M3 — Community word voting accepts guest votes with `+1` weight equal to authed
- **Where:** `communityWordManager.ts:120-137` — `voteData.user_id` OR `guest_id`, both treated identically by `recordVote`.
- **Issue:** Guests are session-scoped and cheap to spawn; they should not have promotion power.
- **Fix:** `vote_weight = user_id ? 1 : 0.25`; sum-of-weights hits `PROMINENT_THRESHOLD` instead of count. Or simpler: guests can suggest (`likes_count` += 0) but only authed users move the needle. Tie into C1.

### M4 — `english_words_approved.txt` is 142,309 lines committed
- **Where:** `english_words_approved.txt` (142309 lines), `dictionaryLoaders.ts:59` reads it.
- **Issue:** Misleading filename — this is the npm-package baseline + historical adds, not "community-approved". Real community approvals live in DB. Confuses anyone reading the code (per C3).
- **Fix:** Rename to `english_words_baseline.txt`. Add comment in `dictionaryLoaders.ts` documenting that runtime additions are DB-only.

### M5 — No integration test for end-to-end submit → reject → promote
- **Where:** Existing tests cover dictionary loading, path validation, vote recording in isolation.
- **Issue:** Pipeline regression risk is highest at the seams (handler → recorder → cron → promoter). No test exercises full flow.
- **Fix:** Add `backend/__tests__/wordPipeline.integration.test.ts`:
  1. Submit invalid word 5x → assert row in `invalid_word_submissions` with count=5
  2. Mock Milog verify → call cron → assert `milog_status='verified'`
  3. Cron promote → assert `word_scores.is_potentially_valid=true`
  4. Re-submit same word → assert accepted (community valid path)

---

## LOW

### L1 — `MIN_WORD_LENGTH=2` in Milog parser is duplicated from gameplay min
- **Where:** `milogWordVerifier.ts:103`. Game min is `game.minWordLength || 2` (`wordHandler.ts:262`).
- **Fix:** Import from `shared/constants/gameRules.ts` so a single source of truth applies; otherwise game min change won't propagate.

### L2 — Milog rate limit is a single in-memory `lastRequestTime` (`milogWordVerifier.ts:16`)
- **Issue:** Multi-instance deploys (Railway scale-out) bypass the 1-req/sec contract — each pod has its own clock. Milog could see 4-6 req/s.
- **Fix:** Move `lastRequestTime` to Redis with `INCR` + TTL pattern, or run cron only on a single designated worker (already 1-pod likely).

### L3 — `parseVerificationResult` regex-based HTML parse is brittle
- **Where:** `milogWordVerifier.ts:118-142`.
- **Fix:** Use `cheerio` (already a candidate dep) or `linkedom` for DOM parsing. Cheaper to maintain when Milog markup shifts. Track unknown-type rate as alarm (see H3).

### L4 — No admin "revoke from canon" UX surfaced for non-Hebrew
- **Where:** `app/api/admin/milog-words/route.ts` exists for HE only.
- **Fix:** Generalize the admin route to `/api/admin/dictionary-words?lang=` after H1 ships. Reuse `removeApprovedWord` (already wired) + `invalidateMilogCache` pattern per-lang.

---

## Recommended sprint order

1. **Sprint A (defense, ~2 days):** C2 weirdness filter (client+server), C1 threshold bump + authed-voter weight, M3 guest-vote demote. Ship together — these are the user's stated ask.
2. **Sprint B (Hebrew tighten, ~1 day):** H3 default-deny on `unknown` Milog type, M1 graceful-shutdown flush, L1 min-length import.
3. **Sprint C (English verifier, ~2 days):** H1 Wiktionary `en` adapter behind `DictionaryVerifier` interface, generalize Milog-cron to language-agnostic queue (H2). Ship behind feature flag, observe a week.
4. **Sprint D (cleanup, ~1 day):** C3 file-write removal, M4 rename, M5 integration test.
5. **Sprint E (more languages, ~2 days):** H1 `es`, then `sv`, then `ja`. One PR each.

Defer: M2 telemetry (low risk if Sprint A ships), L2 distributed rate-limit (only matters at scale-out), L3 cheerio parser, L4 admin UX.

---

## Non-recommendations (out of scope)

- Replacing `Set.has` with Bloom filter — 50k-word `Set` is fine on Node, no measurable perf win.
- Rewriting dictionary loader pipeline — works, just dual-sourced (C3 fixes that).
- Building a generic moderation UI from scratch — `app/api/admin/milog-words` pattern generalizes; don't go further than that.
