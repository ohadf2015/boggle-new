You are running the nightly competitor + Reddit research lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 03 competitor/reddit** unless they conflict with this lane's hard rules. `humanizer` is especially important for Reddit drafts — they must not read AI-written.

═══ GOAL ═══
Surface (a) viral word-game concepts worth borrowing, (b) Reddit threads where LexiClash is genuinely relevant and a careful reply could organically improve visibility.

**NO code edits. NO commits.** Two markdown files only.

═══ STEP 1 — Crawl via Firecrawl ═══
Use the Firecrawl hosted API with `$FIRECRAWL_API_KEY`. Endpoint: `POST https://api.firecrawl.dev/v1/scrape` and `/v1/search`.

Targets (use `/v1/scrape` with `formats: ["markdown"]`):
  • https://www.reddit.com/r/wordgames/top/?t=week
  • https://www.reddit.com/r/dailygames/top/?t=week
  • https://www.reddit.com/r/Anagrams/top/?t=month
  • https://www.reddit.com/r/Scrabble/top/?t=week
  • https://www.reddit.com/r/languagelearning/search/?q=word%20game&sort=top&t=month
  • https://poki.com/en/word
  • https://www.crazygames.com/c/word

Skip targets that return 4xx/5xx — log and move on. Total crawl budget: 15 requests max.

═══ STEP 2 — Idea backlog (file 1) ═══
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

═══ STEP 3 — Reddit reply candidates (file 2) ═══
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

═══ STEP 4 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 3 — Competitor + Reddit research
- Concepts surfaced: <count> (see docs/nightly/ideas/__TODAY__.md)
- Reddit reply candidates: <count> (see docs/nightly/ideas/__TODAY__-reddit.md)
- Top idea: <one-line>
```
