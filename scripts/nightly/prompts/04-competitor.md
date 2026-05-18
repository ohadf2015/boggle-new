You are running the nightly competitor + Reddit research lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 04 competitor/reddit** unless they conflict with this lane's hard rules. `humanizer` is especially important for Reddit drafts — they must not read AI-written.

═══ GOAL ═══
Surface (a) viral word-game concepts worth borrowing, (b) Reddit threads where LexiClash is genuinely relevant and a careful reply could organically improve visibility.

**NO code edits. NO commits.** Two markdown files only.

═══ TOOLS — use these (NO external API key needed) ═══
- **`WebSearch`** — broad discovery ("site:reddit.com r/wordgames best of week", "indie word game launches reddit 2026", etc.)
- **`WebFetch`** — pull specific URLs. **Prefer `old.reddit.com/r/<sub>/top/?t=week` for plain HTML** — the new reddit.com requires JS and returns near-empty content to WebFetch.
- **`agent-browser` skill** — fallback ONLY if WebFetch returns empty on a JS-heavy site (e.g., a tournament results page that hydrates client-side). Most targets work fine with WebFetch + the `old.reddit.com` workaround.

If a target returns 429/403 (Reddit sometimes rate-limits unauthenticated reads): retry once with a 30-second wait, then move on. Do not block the lane on a single source.

═══ STEP 1 — Discover via WebSearch ═══
Run 3-5 broad WebSearch queries to find what's trending. Examples:
- `WebSearch("reddit r/wordgames top this week site:reddit.com")`
- `WebSearch("reddit r/dailygames top this week site:reddit.com")`
- `WebSearch("indie word game launch 2026")`
- `WebSearch("viral wordle clone 2026")`
- `WebSearch("anagram game new release reddit")`

Keep the SERP snippets — they often contain the post titles + upvote counts you need without further fetching.

═══ STEP 2 — Deep-fetch the highest-signal candidates ═══
Pick 3-6 URLs from search results worth pulling in full:
- `WebFetch("https://old.reddit.com/r/wordgames/top/?t=week", "list top posts with title, upvotes, comment count, permalink")`
- `WebFetch("https://old.reddit.com/r/dailygames/top/?t=week", "...")`
- `WebFetch("https://old.reddit.com/r/Anagrams/top/?t=month", "...")`
- `WebFetch("https://poki.com/en/word", "list top word games + featured concepts")`
- `WebFetch("https://www.crazygames.com/c/word", "...")`

For each fetch use a *narrow prompt* — telling WebFetch exactly what facts you want extracted reduces noise.

If WebFetch returns essentially-empty content (likely JS-only render), invoke the `agent-browser` skill to navigate the URL and extract via DOM — but do this MAX twice per run, it's slower.

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
Write `docs/nightly/ideas/__TODAY__-reddit.md`:

```
# Reddit reply candidates — __TODAY__

> **Drafts only — user reviews and posts manually.** Never auto-post.
> Use an older account with established karma. Read each subreddit's self-promo rules first.

## Threads worth replying to

### <thread title> [permalink]
- subreddit: r/<name> (self-promo rule: <strict/loose/none>)
- OP question: <1-line summary>
- why we'd reply: <organic relevance — e.g. asking for free no-ads word game, asking how to learn Hebrew vocab>

**Draft A (helpful-only, no product mention):**
> <reply text — answer the question with real info; do not mention LexiClash>

**Draft B (value-first + light product mention, only if genuinely the answer):**
> <reply text — lead with helpful answer; mention LexiClash once with a specific feature that fits the question — e.g. "a small free browser game I built that supports Hebrew" — never include URL unless OP asked for recs>

---
```

Rules for picking threads:
  • Skip r/AskReddit, r/NoStupidQuestions, r/woahdude, anywhere with strict no-self-promo
  • Default to Draft A; only write Draft B when LexiClash is genuinely the best answer (e.g. "free browser word game, no signup, Hebrew support")
  • NEVER include URLs unless OP asked for recommendations
  • Skip threads >7 days old (won't surface)
  • Skip threads with <5 upvotes (low reach)
  • Max 6 threads

═══ STEP 5 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 4 — Competitor + Reddit research
- Sources fetched: <count> (WebFetch + WebSearch + agent-browser if used)
- Concepts surfaced: <count> (see docs/nightly/ideas/__TODAY__.md)
- Reddit reply candidates: <count> (see docs/nightly/ideas/__TODAY__-reddit.md)
- Top idea: <one-line>
- Sources that failed (rate-limited / empty): <list or "none">
```
