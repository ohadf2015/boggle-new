# Word Quality — Bulletproofing WordHunt Daily + MP

> Goal: good, non-niche, interesting words across ALL languages for **both** Word Hunt Daily and Word Hunt MP; a self-improving mechanism that prevents niche/proper-noun/garbage words in future; leverage the player-submitted-word signal (what real players actually know).

## Evidence (prod, 2026-06-30 via MCP)

### Daily bank (`daily_challenge_word_bank`) is a dirty pool the validator only skims
- The nightly validator (`validate-upcoming-daily-words`) judges only the **~7 served words/lang/night** and replaces bad ones. The **pool they're drawn from stays unvetted.**
- Random sample of *active* (servable) **en** bank: ~45% proper nouns (HALEY, GALILEO, KABUL, MUJIBUR, KARZAI, MYANMAR, UKRAINE, MURPHY).
- **ja** bank: 2853 active, **0 ever blocked**; sample ~90% Wikipedia sentence *fragments* + person names (会での提, その後溺, 小林慶行). Class-4 silent failure.
- **The selection RPC `get_random_words_from_bank` filters only `status='active'` + length — never `validation_status`.** So judged-`rejected`-but-`active` words (en 165 / he 135 / sv 140 / **ja 267**) are **live-servable now**, plus all `pending` (en 2891 / ja 2560 / he 1286 / sv 2069 / es 1049).

### The existing `validation_status` is UNTRUSTWORTHY — do not reuse as allowlist
- en `approved` = ARES/ODIN/LOKI/BASTET/ISIS/MEDUSA/THOTH/SPHINX/ASGARD — **proper-noun deities/creatures** (themed-batch preset, not judged).
- en `rejected`-active = NUCLEAR/VICTORY/NETWORK/HISTORY/PICTURE/PLASTIC/PROJECT — **good words wrongly rejected**.
- ja `approved` (26) happen to be decent science kanji (物体/速度/銀河/宇宙) but tiny + themed-preset, not from `judgeDailyWord`.
- ⇒ **Re-judge the whole bank with `judgeDailyWord`.** Reset preset verdicts; only the real judge may write the trusted marker.

### Seeder treadmill risk is LOW
- Wikipedia seeder is dormant: last insert 2026-03-30 (~3mo ago), 0 inserts last 7d all langs. Backlog is static. A one-time sweep + a future insert-gate holds.

### Player-word positive signal exists, is real, but raw
- `player_words.times_submitted`: he 4049 words (663 ≥5×) / en 3319 (496) / es 2081 (154) / sv 250 (0 ≥5×) / ja 23. RU effectively 0.
- Dominated by 2–3-letter words (`go/no/pad/sit/car`) — every found word counts. Usable only with **length(5–7, ja 2–4) + freq≥2 + dict-valid + judge-pass** gating.
- ⇒ Positive loop is realistic for **en/he/es**; **sv/ja/ru** need curated/dict seeds.

### MP WordHunt is more exposed than Daily
- MP has **no LLM judge** — only a 60-word hardcoded blacklist + a vowel heuristic (`isWordHuntQuality`), and a **"return unfiltered word" last resort**.
- MP target is picked **from the solved grid** (grid-first), so target can be any rare/proper dictionary word that happens to be on the board. No served-word safety net (unlike Daily).
- Curatable banks: `backend/common_hunt_words_*.txt` (en 802 / he 793 / ja 799 / sv 600 / es 600 / **ru 177 thin**).

## Design — one trusted verdict, fail-closed, both modes

### Principle
A word is servable **only if the real `judgeDailyWord` approved it.** Unvetted (`pending`), errored, or `rejected` → never served (fail-closed). Every reject/abort path alerts (Class-4 discipline). The pool, not just the served word, is kept clean.

### D1 — Trusted marker + RPC fail-closed (Daily)
- Stop trusting preset `validation_status`. Reset all non-admin-override rows to `pending`; thereafter only `judgeDailyWord` writes `approved`/`rejected` (+ `meaning`, `interestingness_score`, `judged_at`).
- Tighten `get_random_words_from_bank`: add `AND validation_status='approved'`. **Sequencing:** ship the sweep first to populate real `approved`, *then* flip the RPC (else serving starves — current real-approved pool ≈ 0).
- Keep the existing served-word validator as defense-in-depth.

### D2 — Proactive full-bank sweep cron (Daily) — runs in prod (Vertex)
- New nightly job: judge all `validation_status='pending'` active words in batches via `judgeDailyWord`. Idempotent (skip `judged_at` set). Incremental (only new/pending).
- **Fail-closed batches:** on LLM/parse error leave rows `pending` (retried) — never auto-approve. Alert on sustained failure.
- `approved` → store meaning + interestingness; `rejected` → `status='blocked'` + reason. Self-cleans the pool over a few nights.
- Assert per-lang active-approved floor; alert if below serving threshold.

### D3 — Positive loop: player_words → bank (no LLM, MCP-seedable now)
- Promote `player_words` (length-correct, `times_submitted≥2`, dict-valid, not already in bank) as bank rows `source='player_words'`, `validation_status='pending'` → the sweep judges them. Grows the approved pool with **known-not-niche** words. en/he/es strong; sv/ja/ru rely on dict/curated seed.

### D4 — "Interesting/fun" (req 3)
- Wire the unused `interestingness_score`: judge prompt returns a 1–5 concreteness/evocativeness score; selection can rank/weight, not just gate. Avoids "known but boring" (top player words are dull).

### D5 — MP WordHunt gate (deterministic at runtime, LLM offline)
- **Curate** `common_hunt_words_*.txt` through `judgeDailyWord` (prod script) → drop proper nouns/niche; augment thin banks (ru) from dict + player_words.
- **Runtime root fix (no LLM):** a target must come from a **trusted set** = curated common bank ∪ judge-approved daily bank ∪ player-known words. Never an arbitrary rare dictionary word from the grid. If no trusted word is in the grid → regenerate grid (or pick trusted word target-first and build grid around it). Closes the "unfiltered last resort" leak deterministically.
- Harden `isWordHuntQuality` accordingly; keep the blacklist as belt-and-suspenders.

### D6 — Housekeeping
- de/fr banks: not in supported-locale regex → unservable dead data; leave (or purge in a cleanup migration).
- ru: build an approved seed (ru dict + judge in prod) so daily can serve ru "good in all languages." Lower priority; mechanism handles it.

## Bulletproofing checklist (Class-4 silent-failure discipline)
- [ ] No fail-open: unvetted/errored words never served (RPC requires `approved`).
- [ ] Batch judge errors leave `pending`, never auto-approve; sustained failure alerts.
- [ ] Per-lang active-approved floor asserted; below-floor alerts (not silent serve).
- [ ] ja specifically re-judged (0-blocked was decoupled verdict, now enforced).
- [ ] MP target restricted to trusted set; grid regen if none — never silent rare-word target.
- [ ] Future insert-gate documented for when the Wikipedia seeder wakes.

## Phasing
1. **P1 Daily fail-closed + sweep** — migration (trusted marker, reset, `judged_at`), sweep cron (pure+DI+tests), RPC tighten (after sweep populates), alerts. Re-judges existing bank in prod.
2. **P2 Positive loop** — player_words→bank seeder (SQL/MCP + nightly), interestingness wiring.
3. **P3 MP gate** — offline curation script, trusted-set runtime gate, harden `isWordHuntQuality`, tests.
4. **P4 ru + housekeeping** — ru seed, optional de/fr purge.

Verification gated on prod cron run (Vertex unverifiable from dev); DB queries confirm after.

---

## Implementation status (2026-06-30)

Built + TDD-green + tsc0/lint0:
- **Judge** (`lib/ai-service/dailyWordJudge.ts`): now returns `interestingness` 1–5 (req 3).
- **Sweep** (`lib/dailyChallenge/sweepWordBank.ts` + `backend/modules/wordBankSweep.ts`): proactively judges the whole active pool, fail-closed (errors leave `pending`, never auto-approve), bounded concurrency. Cron `sweep-daily-word-bank` 02:00 UTC, 800/lang/night.
- **Trust anchor migration** (`20260630160000`): `judged_at` + `meaning` cols, `get_unjudged_bank_words` RPC, indexes. APPLIED to prod.
- **Fail-closed selection** (`20260630170000`): `get_random_words_from_bank` serves only judge-approved once a lang has ≥40 approved (self-tightening per lang, no starvation). APPLIED to prod.
- **Positive seed**: player_words (≥2×, dict-valid by construction, length-correct) injected as `pending` candidates via MCP.
- **Year-ahead** (`lib/dailyChallenge/assignYearAhead.ts` + `backend/modules/yearAheadAssigner.ts`): distinct, highest-interest, no-repeat-within-365d slot pre-assignment. Cron `year-ahead-daily-words` weekly Sun 05:00. One-shot `scripts/oneoff/yearAheadPopulate.ts`.
- **MP no-repeat** (`backend/modules/wordHuntManager.ts`): `exclude` param on selection + bounded recent-targets LRU; wired in `gameStartHandler`. MP target won't repeat across consecutive games.
- **MP list curation** (`scripts/oneoff/curateMpWords.ts`): rewrites `common_hunt_words_*.txt` = (existing − bank-rejected) ∪ bank-approved, reusing sweep verdicts (no new LLM).
- **Telegram alert fix**: both sweep + existing validator alerts now escape MarkdownV2 (the failure alert itself was 400-ing silently — Class-4).

Proven in prod (real Vertex via `railway run`): judge rejects TOMLIN/BARDIA/BONDI/GIUFFRE (proper nouns) + DEEMS/MURDERS (inflected); approves PREACH/PHYSICS/GARDEN. Fail-closed confirmed (ASPEN/SODIUM no-JSON → left pending). Backlog (~10k) draining via session sweeps (en/he/es) + nightly cron.

Deferred: ru daily bank (empty — mechanism seeds it once ru has candidates); sv/ja approved pools fill via nightly cron over ~2-3 nights; optional re-judge of hand-curated MP `.txt` words not in the bank.
