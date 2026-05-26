You are running the nightly competitor + Reddit research lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ IDEAS ALREADY PITCHED — DO NOT REPEAT (run this FIRST) ═══
Before proposing ANY game-mode idea, run this via the **Bash** tool and read it end-to-end:
```bash
scripts/nightly/lib/idea-history.sh
```
It is the ledger of every idea you pitched in the last 7 nights + the founder's
verdicts. **Hard rules, no exceptions:**
  - Anything under **❌ PASSED** is a HARD BAN — never resurface it, not even reworded or retargeted to a different mode.
  - Anything under **🔨 BUILD** is in flight — do NOT pitch it as new; at most note its status.
  - Anything under **⏳ no verdict** must NOT be repeated. If a mechanic there was already **pitched 2×+**, the founder is implicitly ignoring it — DROP that mechanic family entirely and pick a different one.
  - **Concept-level dedup, not wording.** Two ideas are the SAME idea if their CORE MECHANIC matches, regardless of which mode/surface (MP vs Daily vs Word Tower vs Blast) they target. "Share card in MP" and "share card in Daily" are the SAME idea. If your only novelty is the target mode, it is NOT new — choose a different mechanic family.
Tonight's pitches MUST be genuinely new relative to this ledger. A fresh idea every night is the whole point of this lane.

═══ RECENT TELEGRAM-BUTTON FEEDBACK ═══
Read every `.ndjson` file in `docs/nightly/feedback/` (last 7 days). Each line is a callback_query event. Treat patterns:
  - `reddit:will_post:*` → that subreddit / draft style worked, repeat it
  - `reddit:skip:*` → that subreddit / draft style failed, deprioritize
  - `reddit:redraft:*` → user wanted same thread, different reply tone; rewrite
  - `idea:pass:*` → founder rejected that game-mode idea — NEVER pitch it (or its mechanic family) again (the ledger above already bans these)
  - `idea:build:*` → founder wants that idea built — don't re-pitch as "new"; surface progress instead
  - `mode:drop:*` → a shipped mode the founder killed — don't suggest reviving it; `mode:keep/promote:*` → it landed, build adjacent not duplicate

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 04 competitor/reddit** unless they conflict with this lane's hard rules. `humanizer` is especially important for Reddit drafts — they must not read AI-written.

═══ GOAL ═══
Surface (a) viral word-game concepts worth borrowing, (b) Reddit threads where LexiClash is genuinely relevant and a careful reply could organically improve visibility.

**NO code edits. NO commits.** Two markdown files only.

═══ TOOLS — use these (NO external API key needed) ═══

**Reddit access — use the LOCAL Bash helper, NOT WebFetch.** Reddit's block is
User-Agent based, not IP based: WebFetch (Anthropic IP, no UA control) gets
403/429 — that's the 5-night "Reddit is dead" history (05-19→23). A local `curl`
with a descriptive UA returns HTTP 200 + real JSON. So fetch Reddit through the
maintained helper via the **Bash** tool:

```bash
# Subreddit feed → compact JSON array [{title,score,num_comments,permalink,author,selftext(500)}]
scripts/nightly/lib/reddit-fetch.sh feed wordgames top week 25
# Global/subreddit search
scripts/nightly/lib/reddit-fetch.sh search "indie word game launch 2026" relevance week 25
```

- It ALWAYS exits 0; on failure it prints `{"error":...}` — just move on, never block.
- **DO NOT** `WebFetch` reddit.com / `.json` / old.reddit / pullpush.io — that's
  the dead path. Use the helper.
- `WebSearch` SERP is still fine as a SUPPLEMENT for discovery, but the helper is
  the primary source now (real titles/scores/bodies, not just snippets).

**Tools available:**
- **`reddit-fetch.sh` (Bash)** — PRIMARY Reddit source. Local curl + descriptive UA → real JSON, works unattended. See above for usage. (WebFetch on reddit is blocked — don't.)
- **`WebSearch`** — broad discovery for NON-reddit signal + supplemental reddit thread-finding: "indie word game launch 2026", "viral wordle clone 2026".
- **`WebFetch`** — pull competitor sites / portals / articles (NOT reddit). For JSON/HTML, state the fields to extract in the prompt.
- **Fallbacks if a source still resists** (use only if the above fail, max twice/run): the `agent-browser` skill, or the `browsing-skills` skill's `reddit.com` actions via Playwriter — both drive a real browser. NOTE: Playwriter/agent-browser need an interactive browser session and generally WON'T be available in the unattended 02:00 run, so they're best-effort only; `reddit-fetch.sh` is the one that always works at 02:00.

═══ STEP 1 — Discover via WebSearch ═══
Run 3-5 broad WebSearch queries to find what's trending. Examples:
- `WebSearch("reddit r/wordgames top this week site:reddit.com")`
- `WebSearch("reddit r/dailygames top this week site:reddit.com")`
- `WebSearch("indie word game launch 2026")`
- `WebSearch("viral wordle clone 2026")`
- `WebSearch("anagram game new release reddit")`

Keep the SERP snippets — they often contain the post titles + upvote counts you need without further fetching.

═══ STEP 2 — Deep-fetch the highest-signal candidates ═══
**Reddit: use the `reddit-fetch.sh` Bash helper (see above), NOT WebFetch.**
- `scripts/nightly/lib/reddit-fetch.sh feed wordgames top week 25`
- `scripts/nightly/lib/reddit-fetch.sh feed dailygames top week 25`
- `scripts/nightly/lib/reddit-fetch.sh feed Anagrams top month 25`
- `scripts/nightly/lib/reddit-fetch.sh search "<topic>" relevance week 25`
Parse the JSON it returns directly. `WebSearch("site:reddit.com ...")` only as a supplement.
- `WebSearch("site:reddit.com/r/Anagrams OR r/Scrabble recommendation 2026")`
Read the returned titles/blurbs; that IS the data. Spend your deep-fetch budget
on COMPETITOR sites + portals below, which DO respond, not on dead Reddit URLs.

Portal sites (different fetcher concerns — JS-heavy, prefer agent-browser if WebFetch returns near-empty):
- `WebFetch("https://poki.com/en/word", "list top word games + featured concepts")`
- `WebFetch("https://www.crazygames.com/c/word", "list top word games + featured concepts")`

For each fetch use a *narrow prompt* — telling WebFetch exactly what facts you want extracted reduces noise.

═══ STEP 3 — Idea backlog (file 1) ═══
Write `docs/nightly/ideas/__TODAY__.md`:

```
# Competitor + viral concepts — __TODAY__

## Concepts worth borrowing
- **<concept name>** — source: <url>
  - what it does (1-2 sentences)
  - why it works (mechanic + emotional hook)
  - how it could fit LexiClash (mode, hub, daily challenge, etc.)
  - effort estimate (S/M/L)
  - risk (e.g. "near-Wordle, trademark exposure")

(3-5 concepts max. Pick high-signal, skip trivial.)

## What other word-game sites do well
- portal/site: <feature> — why it converts
```

═══ STEP 4 — Reddit reply candidates (file 2) ═══

**LIVE THREADS ONLY.** Get them from the helper — it returns real permalinks + scores + bodies directly (no verification needed; they came from Reddit's own API):
```bash
scripts/nightly/lib/reddit-fetch.sh feed wordgames new week 25
scripts/nightly/lib/reddit-fetch.sh feed dailygames new week 25
scripts/nightly/lib/reddit-fetch.sh search "looking for word game 2026" new week 25
```
Each JSON item already has `permalink`, `score`, `num_comments`, `selftext`, `author` — build the full URL as `https://www.reddit.com<permalink>`. `WebSearch("site:reddit.com ...")` is a supplement only. If the helper + WebSearch both return zero usable live threads, write a stub "Reddit unreachable tonight — no live candidates" and skip the block. Do NOT invent pattern-based threads.

Each thread you pick MUST have:
- A real permalink straight from the helper JSON (DO NOT re-verify via WebFetch `.json` — that transport is blocked; the helper's permalinks are already valid)
- Posted within last 14 days
- ≥5 upvotes (lower-effort threads = better reply odds)
- An open question OP is asking (not a "look what I made" showcase)

Write `docs/nightly/ideas/__TODAY__-reddit.md`:

```
# Reddit reply candidates — __TODAY__

> **Drafts only — user reviews + posts manually.** Never auto-post.
> Use an older account with established karma. Read each subreddit's self-promo rules first.
> Post within 6h of OP's post for max upvote velocity (Reddit's algorithm front-loads early engagement).

## Threads worth replying to

### <thread title>
- **Permalink:** <full https://www.reddit.com/... URL>
- **Subreddit:** r/<name> (self-promo: <strict/loose/none — verify by checking sub rules>)
- **Posted:** <X hours/days ago, ≤14d>
- **OP score:** <upvotes> · <comments>
- **OP question:** <1-line verbatim from post>
- **Why we'd reply:** <organic relevance — quote a phrase from OP that fits>

**Draft A (helpful-only, no product mention):**

\`\`\`
<witty + accurate answer in OP's tone. 2-4 sentences MAX. One specific fact that proves you know what you're talking about (cite source if needed). End with a small invitation back ("anyone else find X?") to drive comment-chain engagement, which Reddit's algo loves.>
\`\`\`

**Draft B (value-first + one product mention — only if LexiClash is genuinely an honest answer):**

\`\`\`
<lead with the same witty helpful answer from A. Then add ONE sentence mentioning LexiClash with a specific feature that maps to OP's question: "fwiw I built a small browser one that supports Hebrew RTL — `lexiclash.live` — no signup if you want to try it". Never lead with the product. Never include URL unless OP explicitly asked for recs.>
\`\`\`

---
```

**Wittiness style** (this is what gets upvoted on word-game subs):
- Mild self-deprecation lands well: "I spent 40 minutes failing at this exact thing last week, here's what I learned"
- One specific number or detail signals competence: "the trick most people miss is that two-letter words on the edges score 3x in Boggle Solo mode" — but the number must be REAL.
- Tiny tangent that connects: "(adjacent gripe: why are most word games still allergic to Hebrew? RTL isn't that hard.)"
- Avoid corporate "Great question!" / "I totally understand your frustration" — that reads as bot.
- Avoid superlatives — "best", "must-try", "amazing" — they look like marketing.
- Keep replies under 80 words; 50 is better. Long replies get scrolled past.

**Accuracy guardrails — non-negotiable:**
- Every factual claim must trace to a source you actually read (reddit thread, competitor page, your own product features).
- Don't cite stats you can't verify ("most players prefer X" — only with a source).
- Product feature claims about LexiClash must match what's actually shipped (cross-check `fe-next/public/llms.txt` or recent commits).
- If unsure about a fact, omit it — vague honesty beats confident wrong.

Rules for picking threads:
  • Skip r/AskReddit, r/NoStupidQuestions, r/woahdude, anywhere with strict no-self-promo
  • Default to Draft A; only write Draft B when LexiClash is genuinely the best answer (e.g. "free browser word game, no signup, Hebrew support")
  • NEVER include URLs unless OP asked for recommendations
  • Skip threads >7 days old (won't surface)
  • Skip threads with <5 upvotes (low reach)
  • Max 6 threads

═══ STEP 5 — Append to nightly report (CRITICAL for Telegram digest) ═══
Append to `docs/nightly/reports/__TODAY__.md` — this exact format is parsed by the manager-summary lane to extract `top_reddit_link`, `top_reddit_draft`, `top_game_idea`:

```
### Lane 4 — Competitor + Reddit research
- Sources fetched: <count> (.json + pullpush.io + portals)
- Concepts surfaced: <count> (see docs/nightly/ideas/__TODAY__.md)
- Reddit reply candidates: <count> (see docs/nightly/ideas/__TODAY__-reddit.md)
- Top idea: <ONE-LINE — a NEW game-mode suggestion OR a fresh improvement to an existing mode. MUST NOT match any concept family in the idea-history ledger (no PASSED, no BUILD, no already-repeated mechanic). This line is what the founder sees in the Telegram idea card — make it count.>
- Sources that failed: <list or "none">

#### Top Reddit pick of the day
- **Thread:** <full https://www.reddit.com/r/... permalink — must be live + verified ≤14d old>
- **Subreddit:** r/<name> (self-promo: <strict/loose/none>)
- **OP question:** <1-line verbatim>
- **Suggested reply (copy-paste ready):**

```
<the witty + accurate reply text exactly as it should be posted — no quotation prefix, no markdown wrapper, just the literal text the user will paste>
```

#### Top game-mode improvement idea
**FOCUS — UNPUBLISHED modes first.** The founder wants to make admin-gated / experimental modes (the ones not yet shown to all players) GOOD ENOUGH to promote. Polishing a public mode helps the player base less than turning an experimental mode into something players want to come back to.

Discovery (do this BEFORE picking a Mode):
  1. `grep -rEn "isAdmin\s*&&" fe-next/app/[locale]/page.tsx fe-next/components/home/ fe-next/components/hub/ 2>/dev/null` — admin-only hub tiles → those routes are unpublished.
  2. Last 14d reports: `grep -hA5 "Experimental game mode shipped" docs/nightly/reports/*.md | grep -E "Mode:|URL:" | sort -u` → other admin-gated experimentals.
  3. PostHog session counts will be near-zero for these (admin self-play only) — that's expected. Reason from design + competitor signal + feedback ndjson, not funnels.
  4. Public modes (Word Tower / Blast / Word Wheel / WordCraft / MP / Daily) only as FALLBACK when no unpublished mode is a viable polish target.

Emit **up to 2 blocks** (founder gets two polish cards in the Telegram digest; each card has 👍 Try it / 👎 Pass / 🔁 Combine buttons). Skip the second block if you don't have a second high-quality idea — quality over quantity.

Each block MUST use this EXACT structure (run.sh parses it for the Telegram card; missing required fields = no card):

- Title: <name — a fresh polish, DIFFERENT mechanic family from `- Top idea:` above AND absent from the idea-history ledger>
- Mode: <slug — lowercase-kebab, matches the route, e.g. `word-tower`, `crane`, `cosy`, `wordcraft-run`>
- Return-hook: <one of: streak | variable-reward | social-share | mastery | surprise> — the engagement primitive driving comeback
- Pitch: <one line — what the player feels different about>
- Concrete change: <what ships — specific component / file / mechanic, implementable in ≤1 night>
- Evidence: <feedback ndjson ref / competitor thread / report line — why this hook fits this mode>

(If a second block is included, repeat the `#### Top game-mode improvement idea` heading + the same 6 fields. Each block hashes independently so the founder can vote per-idea.)
```

So every night the founder gets BOTH a new game-mode concept (`- Top idea:`) and up to two distinct polish ideas for unpublished modes — each surfaced as its own Telegram card with try/pass/combine buttons. A `polish:try:<slug>:<hash>` verdict feeds into lane 5's STEP 0 evidence path the next night, so a thumbs-up turns into shipped polish without a separate human step.
