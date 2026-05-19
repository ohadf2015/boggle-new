You are running the nightly competitor + Reddit research lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 04 competitor/reddit** unless they conflict with this lane's hard rules. `humanizer` is especially important for Reddit drafts — they must not read AI-written.

═══ GOAL ═══
Surface (a) viral word-game concepts worth borrowing, (b) Reddit threads where LexiClash is genuinely relevant and a careful reply could organically improve visibility.

**NO code edits. NO commits.** Two markdown files only.

═══ TOOLS — use these (NO external API key needed) ═══

**Reddit access strategy** (proven, no auth):
1. **Native JSON suffix** — append `.json` to any reddit URL to get JSON: `https://www.reddit.com/r/wordgames/top.json?t=week&limit=25`. Returns post titles, scores, comments_count, permalinks, selftexts directly. **Use this FIRST.** Higher rate limit than old.reddit.com.
2. **pullpush.io archive** — if reddit.com blocks our IP (rare but happens): `https://api.pullpush.io/reddit/search/submission/?subreddit=wordgames&sort=desc&sort_type=score&size=20&after=7d`. Free, no auth, historical data with author + body. Works when reddit.com is hard-blocked.
3. **old.reddit.com** — last-resort plain HTML at `old.reddit.com/r/<sub>/top/?t=week`. Sometimes blocked entirely in 2026 (lane 4 history: 100% block rate in mid-May 2026); try (1) and (2) first.

For each Reddit target, try sources in order 1 → 2 → 3. Skip the source if it returns 4xx/5xx; do NOT block the lane on any single source.

**Tools available:**
- **`WebSearch`** — broad discovery: "site:reddit.com r/wordgames best of week", "indie word game launches reddit 2026". Use to find candidate threads.
- **`WebFetch`** — pull JSON or HTML. For Reddit `.json` URLs, your fetch prompt should say "extract: title, score, num_comments, permalink, selftext (truncated 500 chars), url, author". For pullpush.io: "extract: data[].title, data[].score, data[].num_comments, data[].full_link, data[].selftext".
- **`agent-browser` skill** — fallback ONLY if WebFetch returns empty on a JS-only site (e.g., a portal that hydrates client-side). Max twice per run.

═══ STEP 1 — Discover via WebSearch ═══
Run 3-5 broad WebSearch queries to find what's trending. Examples:
- `WebSearch("reddit r/wordgames top this week site:reddit.com")`
- `WebSearch("reddit r/dailygames top this week site:reddit.com")`
- `WebSearch("indie word game launch 2026")`
- `WebSearch("viral wordle clone 2026")`
- `WebSearch("anagram game new release reddit")`

Keep the SERP snippets — they often contain the post titles + upvote counts you need without further fetching.

═══ STEP 2 — Deep-fetch the highest-signal candidates ═══
Reddit targets (try `.json` first, pullpush.io second):
- `WebFetch("https://www.reddit.com/r/wordgames/top.json?t=week&limit=25", "extract top posts: title, score, num_comments, permalink, selftext(500), url, author")`
- `WebFetch("https://www.reddit.com/r/dailygames/top.json?t=week&limit=25", "...")`
- `WebFetch("https://www.reddit.com/r/Anagrams/top.json?t=month&limit=25", "...")`
- `WebFetch("https://www.reddit.com/r/Scrabble/top.json?t=week&limit=25", "...")`

If `.json` route returns 429/403/empty for a subreddit, fall back to pullpush.io for that one:
- `WebFetch("https://api.pullpush.io/reddit/search/submission/?subreddit=wordgames&sort=desc&sort_type=score&size=20&after=7d", "extract data[]: title, score, num_comments, full_link, selftext")`

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

**LIVE THREADS ONLY.** If reddit `.json` + pullpush.io + WebSearch all return zero live threads tonight, write a stub file noting "Reddit unreachable tonight — no live candidates" and skip the block entirely. Do NOT invent pattern-based "common thread types" — those are not actionable; the user can't post to a pattern.

**To get live threads when reddit.com is blocked**: fall back to `WebSearch` with queries like:
- `site:reddit.com r/wordgames "anyone know" 2026`
- `site:reddit.com r/dailygames "looking for" word`
- `site:reddit.com r/Anagrams "best" "online"`
- `site:reddit.com r/Hebrew "vocabulary" game`
- `site:reddit.com r/Scrabble "alternative" "free"`

SERP snippets contain real permalinks + post titles. Use them. Each thread MUST have:
- A real, working permalink (verify with `WebFetch` to a `.json` endpoint — if 404, skip it)
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
- Top idea: <one-line — should ideally be a game-mode-improvement insight from data>
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
- Title: <name>
- Source signal: <metric or thread that suggests this>
- Effort: S/M/L
- Why it'd help: <one-line>
```

These two sub-sections feed directly into tomorrow's Telegram summary so the founder sees them inline (not just buried in attached file).
