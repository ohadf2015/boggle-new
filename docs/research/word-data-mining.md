# Mining Player Word-Submission Data — Research & Roadmap

> What we can build from the words players actually submit (valid + rejected), across 5 languages.
> Status: research / proposal. Grounded in verified schema (see "Data assets").

## TL;DR

We are sitting on a **per-language word-frequency corpus built from real gameplay** plus a
**crowd-sourced list of words our dictionaries are missing** — and (checked against prod) we
**barely use either, and one path is dark**:
- The dictionary auto-heal pipeline **exists but is stalled** — 3,522 words sit `pending` and
  never verified. Highest-leverage move is **unblocking it**, not building it. (Mostly Hebrew.)
- Bots **don't actually use the corpus** (`times_found_by_bots = 0` everywhere) — second move is
  switching that path on, then sampling human frequency so bots stop dumping dictionary words.
- This is a **Hebrew-first game**; sv/ja are too data-thin for frequency features. Prioritize he/en/es.

Everything else (trending words, "you missed it", rare-find brag cards) rides on the same two tables.

**The guard that makes promotion safe** — rank by **distinct users + distinct games**, never raw
`times_submitted`/`submission_count` — is **not yet queryable**: the tables store only first/last
submitter, not a distinct set (see Measured Reality D). Treat it as a schema prerequisite; until it
lands, gate on distinct-*game* spread + the existing external `verification_status`.

---

## Measured reality (prod, 2026-06-26) — read this before the ideas

The ideas below were sanity-checked against live data. Three premises had to change:

**A. The auto-heal pipeline already exists and is *stalled*, not missing.**
`invalid_word_submissions` carries a full verification machinery: `verification_status`,
`verification_source/url`, `milog_*`, `auto_promoted_at/by`, `approved_at/by`, `player_appeal_count`.
Current state:

| verification_status | words | auto_promoted | last verify attempt |
|---|---|---|---|
| `pending` | **3,522** | 1,113 | **NULL (never attempted)** |
| `not_found` | 215 | 0 | 2026-06-26 02:00 |
| `verified` | 121 | 121 | 2026-06-26 02:00 |
| `rejected_type` | 59 | 0 | 2026-06-26 02:00 |
| `needs_review` | 3 | 0 | 2026-06-26 02:00 |

The verifier ran but processed only ~400 words, leaving **3,522 pending that were never verified**.
There appear to be **two promotion paths** (a count-based auto-promote that promoted 1,113 *while still
`pending`*, and the milog/verification path). So Tier-1 #1 is **"unblock + reconcile the existing
pipeline," not "build it."**

**B. Bots do not actually use the corpus.** `player_words.times_found_by_bots = 0` for **all 5
languages**. Root cause: `incrementBotWordUsage()` existed in `supabase/words.ts` (with a live
`increment_bot_word_usage` RPC) but was **never called** — column added, increment never wired.
This *raises* the leverage of the bot work: it's switching on something that does nothing today.
> **Status (2026-06-26): recording half FIXED.** `submitBotWord` now stamps `bot.language` at
> prepare-time and fires `incrementBotWordUsage(word, language)` on every accepted bot word
> (single choke point; TDD-covered). `times_found_by_bots` will start climbing. Still future work:
> using the resulting bot/human frequency split for **difficulty-banded sampling** (#2 below).

**C. This is a Hebrew-first game; sv/ja are data-starved.**

| lang | valid words (`player_words`) | max freq | `not_in_dictionary` words | `not_on_board` words |
|---|---|---|---|---|
| he | **4,017** | 78 | **1,455** | **152** ⚠ |
| en | 3,132 | 29 | 866 | 21 |
| es | 1,889 | 38 | 728 | 19 |
| sv | 174 | 4 | 596 | — |
| ja | 23 | 1 | 79 | 4 |

Consequences: frequency-based bots are **only viable for he/en/es** (sv/ja corpora too thin to sample).
Hebrew's `not_on_board=152` (vs ~20 elsewhere) is an **RTL board/path bug smell** worth a dedicated
investigation — 152 distinct words players believed were on the board but the engine rejected.

**D. "Distinct users per word" is a schema change, not a free query.** `player_words` stores only
`first_submitted_by` + `last_submitted_by` (two pointers, not a set); `invalid_word_submissions` has
**no per-user column at all**, only `submission_count`. So the abuse-resistant "distinct users" guard
must be *built* (log per-user-per-word, or a distinct-submitter HLL/set) before it can gate anything.
Until then, the available proxies are `submission_count` + distinct-game spread (`first/last_submitted_in_game`)
+ the existing external-dictionary `verification_status`.

---

## Data assets (verified)

| Table | Holds | Key columns |
|---|---|---|
| `player_words` | every **valid** accepted word | `word`, `language`, `times_submitted`, `first_submitted_by`, `game_code`, timestamps |
| `invalid_word_submissions` | every **rejected** word | `word`, `language`, `submission_count`, `reason` ∈ {`not_on_board`, `not_in_dictionary`, `peer_rejected`} |
| `word_votes` / `word_scores` | peer like/dislike → aggregate | `net_score`, `is_potentially_valid` |

Already built and reusable:
- **verify → promote → heal** dictionary pipeline + **LLM dual-judge** skill (`dictionary-improvement`).
- Bots in `botManager.ts` already *weakly* prefer high-`times_submitted` `player_words`.
- Per-language dict files: `backend/{english,hebrew,swedish,japanese,spanish}_words*.txt`.

`reason` is doing three jobs:
- `not_in_dictionary` → **dictionary gap** (word was on the board, had a valid path, just isn't in our set).
- `not_on_board` → **bug/cheat detector** (player thinks it was findable but engine disagrees → path/render bug, or anti-cheat signal).
- `peer_rejected` → **social signal** (already feeds `word_scores`).

---

## Ranked by leverage ÷ effort

### 🟢 Tier 1 — ship first (high leverage, low/known effort, reuses existing pipeline)

**1. Unblock the stalled dictionary auto-heal (highest leverage — the pipeline already exists).**
Do **not** build this from scratch; `invalid_word_submissions` already has the verification +
auto-promote machinery (see Measured Reality A). The real work:
- **Drain the 3,522-word `pending` backlog** that has `verification_last_attempt = NULL` — the
  verifier only ever processed ~400 words. Find why it stopped (silent-failure, Class 4) and rerun.
  This is mostly **Hebrew** (1,455 missing he words) — the single biggest dictionary win available.
- **Reconcile the two promotion paths.** 1,113 words were auto-promoted while still `pending`
  verification — a count-based path bypassing the dictionary check. Decide which is authoritative;
  a count-only promote with no external check is exactly the pollution risk this doc warns about.
- **Gate harder than raw `submission_count`** using the proxies we *do* have today: distinct-game
  spread + external `verification_status='verified'` + per-language profanity blocklist. Add true
  distinct-user gating only after the schema change in (D).
- Measure "% of rejects that are real-word misses" per language as a **dictionary-quality KPI**;
  Hebrew is the hotspot to watch.

*Promotion is staged, not instant* (council/Grok — adopt this):
1. **Candidate** — passes the distinct-user/distinct-game query + profanity pre-filter.
2. **Dual-judge** — existing LLM gate (feed it the "crowd believes this is real" signal as a prior).
3. **Shadow dictionary** — accept the word in only **5-10% of games**; measure real in-game
   success rate + board-generation side effects for 7-21 days.
4. **Promote** to the live dict only after the shadow window shows positive metrics + zero profanity flags.
5. **Heal** — periodic re-score; demote if new data turns negative (pipeline already exists).

*Guardrails:* distinct-users not raw count · **cap any single user's contribution** (max 3 → counts as 1) ·
**burst veto** (flag if >60% of a word's count came from <3 users or <3 games) · profanity/slur blocklist
gate per language *before* the judge · `peer_rejected` count is a veto/heavy downweight · language-specific
normalization + script-variant folding **before** counting (critical for Japanese/Hebrew/Spanish).
Effort: medium — mostly a query + wiring into a pipeline that exists.

**1b. Cheapest first version (do this in week 1):** skip automation — just surface the top 20-50
candidates per language in an admin screen, run them through the existing judge manually for a week,
then automate the shadow step once you trust the candidate query.

**2. Turn the bot corpus path on, then make it human (it's dark today).**
`times_found_by_bots = 0` across all languages — the "weak preference" produces **zero measured
effect**. Step one is a bug hunt: is the path firing, and is `times_found_by_bots` being incremented?
Once it's live, replace "weakly prefer" with **difficulty-banded sampling** — *but only for he/en/es*
(sv=174, ja=23 valid words are too thin; keep those on dictionary sampling):
- *Easy bot* → top-decile common words (what humans find first).
- *Hard bot* → long-tail rare words **that real humans actually found** (not dictionary obscurities).

Reveal order matters as much as choice: humans find short/common words first → order bot reveals by
frequency-rank × length with timing jitter. Result: bots feel like opponents, not dictionary scripts.

*Concrete form (council/Grok):* sample with a Zipf/power-law weight `p(w) ∝ freq(w)^α` (α≈0.7-1.0),
biasing α down for easy bots (stick to common) and up for hard bots (occasionally reach into the
tail). Add **edit-distance-1 near-miss simulation**: ~10-15% of the time the bot "almost" plays a
plausible invalid word and then misses — exactly what humans do under time pressure. Sometimes pass
entirely when no high-confidence word remains.

Effort: low-medium — the data and the weak preference already exist; this is a sampling-curve change.
See `.claude/rules/60-recurring-pitfalls.md` Class 2 — wire frequency loading through the shared
bot reset, not a per-mode branch.

**3. Rare-find brag card (cheapest virality).**
At submit time, look up global distinct-user count for the word. If it's long-tail
("Only 3 players have *ever* found PHLOEM"), fire a celebration + share card. Pure dopamine,
one frequency lookup, generates organic shares. Effort: low.

**4. Dictionary-coverage gap dashboard (analytics, near-free).**
Top `not_in_dictionary` words by distinct users per language → prioritizes dict work and proves
the auto-heal is working. Also surface `not_on_board` spikes → **board/path bug alarm** (a word that
should be findable suddenly getting rejected = generation bug; see Class 4 silent-failure). Effort: low.

### 🟡 Tier 2 — strong, needs a little design

**5. "You missed it" / Ghost round-end.**
After a round, show the high-frequency words *other players found on your board that you didn't*.
FOMO retention hook + vocabulary teaching, sourced by joining `player_words` on `game_code`/board.

**6. Per-language Word-of-the-Day from the mid-frequency band.**
Pick from the recognizable-but-not-trivial band of the *real* per-language distribution — culturally
calibrated, not English-centric. Reuses the frequency table from #2.

**7. Board-quality / difficulty calibration from real yield.**
Each board's real-player word yield (count + score distribution) tells us if a layout is too thin or
too rich. Daily-board selection targets a difficulty band using actual human yield instead of a guess.

**8. Trending words feed.**
Words whose distinct-user `times_submitted` **spiked week-over-week**, per language → a live "what the
world is playing" surface. Social/viral; also a content engine for push notifications.

### 🔵 Tier 3 — bigger bets / monetization

**9. Personalized rare-word challenge.** Words common among others but you've *never* submitted →
"expand your vocabulary" daily challenge. Natural premium hint slot.

**10. Async "steal" duel.** Find the words your opponent found (from `player_words` by game) —
head-to-head built entirely on stored corpus, no live matchmaking.

**11. Signature-words profile.** Your most-found words vs global + your rarest finds → shareable
identity card + vocabulary-growth meter (distinct new words over time) = retention/progression.

**12. Monetization (light touch).** Hint = reveal the *most satisfying* (highest-frequency) word still
on the board; premium "rare-word reveal" shows the rarest remaining. Frequency data makes hints feel
generous instead of random. Keep it light — the real ROI here is retention, not IAP.

---

## Abuse & data-quality guards (apply everywhere)

| Risk | Guard |
|---|---|
| One user inflating a fake word into the dict | Rank by **distinct users + distinct games**, never raw `submission_count`/`times_submitted` |
| Typo/garbage candidates | `not_in_dictionary` already implies a valid board path existed → filters randoms; LLM dual-judge is final gate |
| Profanity / slurs promoted | Per-language static blocklist gate **before** the judge; judge instructed to reject |
| Sybil / fresh-account brigading | Weight by account age / trust; exclude accounts younger than N days from dict candidacy & votes |
| Privacy (`first_submitted_by` is PII-ish) | Aggregate before exposing — "3 players found this" ✅, naming them ❌ unless opt-in |
| `not_on_board` masking a bug | Treat a spike as an **alert**, not noise (Class 4 silent-failure) |

---

## Suggested first PR (smallest end-to-end slice)

Given the measured reality, the first slice is **operational, not greenfield**:
1. **Diagnose the stalled verifier** — why do 3,522 `pending` rows have `verification_last_attempt = NULL`?
   (Likely a Class-4 silent failure / batch cap.) Rerun it to drain the backlog, Hebrew first.
2. **Reconcile the two promotion paths** — confirm what auto-promoted 1,113 `pending` words and decide
   whether a count-only promote (no external dictionary check) should be allowed to stand.
3. **One dashboard row per language**: dictionary-miss rate + backlog size (proves the drain is working).

Parallel quick win (separate, cheap): **investigate Hebrew `not_on_board=152`** — far above the ~20 of
other languages. If it's an RTL path/render bug, fixing it stops rejecting words that *are* findable.

Only after these: build the **distinct-user schema** (Measured Reality D), which de-risks every later
idea (auto-heal gating, trending, bot frequency all want the distinct-user primitive).

---

## Council perspectives

Queried via `claude-council` (Gemini + Grok). Gemini returned `IneligibleTierError` (CLI tier
deprecated — dead). **Grok-build** returned a strong concrete answer; agreement and net-new ideas:

**Consensus with this doc:** auto-heal is S-tier and must rank by distinct users/games not raw count;
LLM dual-judge is the final gate; bots should sample the real frequency distribution; "you missed it" /
crowd blind-spots is the stickiest new feature; profanity/Sybil/burst guards are mandatory.

**Net-new from Grok (folded into the plan above):**
- **Shadow dictionary** stage between judge and live promotion (now in Tier-1 #1).
- **Zipf power-law sampling** `p(w) ∝ freq^α` + edit-distance-1 near-miss simulation for bots (now in #2).
- **Reputation layer** — per-user accepted-rate weights their future votes/candidacy; turns Sybil
  defense into a gradient instead of a hard age cutoff. *(Add to guards as a phase-2 enhancement.)*
- **Burst/velocity veto** — flag words where >60% of count came from <3 users or <3 games (now in #1 guards).
- **"Beat the Crowd" multiplier** — live score bonus for finding words few others found *this game*
  (a competitive variant of the rare-find brag card).
- **Lexical Archaeology** — surface words that spiked 60-90 days ago then dropped (nostalgia + content engine).
- **Language texture** — Japanese compound hunters, Hebrew root-pattern spotting, Swedish long-compound
  brag; per-language sampling/normalization, not one curve for all five.

**Unresolved tension:** Grok leans toward a player-facing **"folk dictionary" community vote screen**
to crowd-promote words; this doc leans automated (LLM judge + shadow) to avoid brigading and moderation
load. Recommendation: ship automated first (no new UI, no new abuse surface); add the community screen
later only if the auto-heal candidate queue proves too conservative.
