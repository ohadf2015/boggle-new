You are running the nightly self-learn lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ CURRENT LEARNINGS (for context — you will REWRITE this file) ═══
__LEARNINGS__

═══ GOAL ═══
Two outputs this lane:

**A) REWRITE** (not append) `docs/nightly/learnings.md` based on the last 7 nightly reports. Output ≤200 lines. The result becomes preamble for all 7 lanes tomorrow.

**B) WRITE** `docs/nightly/loop-improvements/__TODAY__.md` — a meta-review of the nightly loop ITSELF. What's working? What's slow, flaky, redundant, or missing? What concrete improvements would make tomorrow's run produce better outcomes for LexiClash? This becomes a backlog the user (or a future lane) acts on.

═══ STEP 1 — Read evidence ═══
- Last 7 reports: `ls docs/nightly/reports/*.md | sort | tail -7`
- Last 7 run logs: `ls ~/logs/lexi-nightly/run-*.log | sort | tail -7` (timing per lane, error patterns, retries)
- Last 14d git log on master: `git log --since="14 days ago" --pretty="%h %s" master`
- Look specifically for:
  • Patterns that shipped repeatedly without rollback → "what works"
  • Patterns that triggered Telegram alerts, were reverted, or hit gate failures → "what failed"
  • Specific file paths or modules that keep needing fixes → "carry-forward watches"
  • Lane budget overruns (8-file cap hits) → "tighter scope needed"
  • Lanes that frequently produce empty output → prompt clarity issue
  • Lanes that timeout → infrastructure issue
  • Manager-summary signal quality → are the right things being surfaced?

═══ STEP 2 — Output A: learnings.md skeleton ═══
Use this skeleton (preserve sections marked **DO NOT EDIT** verbatim):

```markdown
# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.**

## What works (validated this week)
- <pattern> — evidence: shipped <N> nights without issue
- ...

## What to avoid (failed this week)
- <pattern> — evidence: alerted/reverted on <date>, cause: <root>
- ...

## Open watches (carry forward)
- <watch item> — first noticed <date>, status: <open|resolving>
- ...

## Specialized Skills (maintained by lane 7)
[UPDATE this table based on outcome evidence — see rules below the table]

## Reddit reply etiquette (lane 4 sub-output)
[preserve verbatim]

## Stat-framing reminders (memory anchors — DO NOT EDIT)
[preserve verbatim]
```

═══ STEP 2b — Specialized Skills table rules ═══
For each lane, mine the last 7 reports for skill mentions + outcome (shipped vs reverted vs alerted):
- Add a skill to a lane's row if it correlated with a shipped outcome in ≥2 nights.
- Remove a skill from a lane if its inclusion correlated with reverts ≥2 of the last 3 nights.
- Cap each row at 4 skills; drop lowest-evidence first.
- Evidence column must be specific: `"shipped 3/3 last week"`, `"reverted 2/3 — overdesign"`, or `"seed"` if no data yet.
- Lane 5 (landing) ALWAYS keeps `frontend-design` or `impeccable:craft` (design quality non-negotiable).
- Lane 6 (SEO) ALWAYS keeps `seo-daily` (mandatory).

═══ STEP 3 — Output B: loop-improvements/__TODAY__.md ═══
Create directory if missing: `mkdir -p docs/nightly/loop-improvements`.

Write `docs/nightly/loop-improvements/__TODAY__.md`:

```markdown
# Loop Self-Review — __TODAY__

## Run health (last 7 nights)
| Lane | Success rate | Avg duration | Avg files touched | Notes |
|------|--------------|--------------|-------------------|-------|
| 01 triage | <N/7> | <Xm> | <N> | <pattern>|
| 02 perf | ... | ... | ... | ... |
| ... | ... | ... | ... | ... |
| 07 self-learn | ... | ... | ... | ... |

## What's working well
- <observation backed by evidence from the table above>
- ...

## Friction points
- <slow/flaky/redundant step + which lane(s) it affects>
- ...

## Concrete improvements (ranked by impact × effort)
1. **<title>** — <one-line proposal>. Effort: S/M/L. Impact: <what gets better>. File(s) to touch: <path(s)>.
2. ...
3. ...
(3-7 items max. Skip vapid "improve docs" — must be actionable.)

## New product/feature ideas surfaced by this week's data
- <idea grounded in lane 02 perf metrics OR lane 03 funnel deltas OR lane 04 competitor research>
- ...
(2-4 ideas. Each must cite the source row/metric/quote.)

## Loop changes shipped THIS WEEK
- <commit summary if any improvement from prior week's loop-improvements/*.md actually shipped>
```

Rules for the "Concrete improvements" list:
- Suggest changes to PROMPTS first, scripts second, infra last. Prompt edits are the cheapest tuning surface.
- Don't propose adding new lanes unless ≥3 nights of evidence show a recurring gap.
- Don't propose removing a lane unless ≥7 nights of no-impact data.
- Tie each proposal to a concrete metric the proposal would improve (Sentry count, p75 LCP, conversion, etc.).

═══ STEP 4 — Discipline ═══
- learnings.md ≤200 lines; loop-improvements ≤150 lines per file.
- Drop entries older than 14d unless still active (replace, not accumulate).
- Be specific. "Lane 4 timed out 3/7 nights, root cause = Reddit blocked" beats "lane 4 had issues."
- No emojis except memory anchors that already use them.

═══ STEP 5 — Cap + finish ═══
PER-LANE CAP: 2 files (`docs/nightly/learnings.md` + `docs/nightly/loop-improvements/__TODAY__.md`).

DO NOT COMMIT. DO NOT PUSH.

═══ STEP 6 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 7 — Self-learn
- Learnings rewritten (lines: <n>)
- New "what works": <count>
- New "what to avoid": <count>
- Carried forward: <count>
- Loop improvements proposed: <count> (top: <one-line>)
- New product ideas: <count> (top: <one-line>)
```
