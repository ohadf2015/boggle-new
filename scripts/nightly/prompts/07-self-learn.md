You are running the nightly self-learn lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ CURRENT LEARNINGS (for context — you will REWRITE this file) ═══
__LEARNINGS__

═══ GOAL ═══
**REWRITE** (not append) `docs/nightly/learnings.md` based on the last 7 nightly reports. Output ≤200 lines. The result becomes preamble for all 6 lanes tomorrow.

═══ STEP 1 — Read evidence ═══
- Last 7 reports: `ls docs/nightly/reports/*.md | sort | tail -7`
- Last 14d git log on master: `git log --since="14 days ago" --pretty="%h %s" master`
- Look specifically for:
  • Patterns that shipped repeatedly without rollback → "what works"
  • Patterns that triggered Telegram alerts, were reverted, or hit gate failures → "what failed"
  • Specific file paths or modules that keep needing fixes → "carry-forward watches"
  • Lane budget overruns (8-file cap hits) → "tighter scope needed"

═══ STEP 2 — Structure ═══
Use this skeleton (preserve sections marked **DO NOT EDIT** verbatim):

```markdown
# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 6** each night from prior 7 reports. **≤200 lines.**

## What works (validated this week)
- <pattern> — evidence: shipped <N> nights without issue
- ...

## What to avoid (failed this week)
- <pattern> — evidence: alerted/reverted on <date>, cause: <root>
- ...

## Open watches (carry forward)
- <watch item> — first noticed <date>, status: <open|resolving>
- ...

## Specialized Skills (maintained by lane 6)
[UPDATE this table based on outcome evidence — see rules below the table]

## Reddit reply etiquette (lane 3 sub-output)
[preserve verbatim]

## Stat-framing reminders (memory anchors — DO NOT EDIT)
[preserve verbatim]
```

═══ STEP 2b — Update Specialized Skills table ═══
For each lane, mine the last 7 reports for skill mentions + outcome (shipped vs reverted vs alerted):
- Add a skill to a lane's row if it correlated with a shipped outcome in ≥2 nights.
- Remove a skill from a lane if its inclusion correlated with reverts ≥2 of the last 3 nights.
- Cap each row at 4 skills; drop lowest-evidence first.
- Evidence column must be specific: `"shipped 3/3 last week"`, `"reverted 2/3 — overdesign"`, or `"seed"` if no data yet.
- Lane 4 (landing) ALWAYS keeps `frontend-design` or `impeccable:craft` (one of them) — design quality is non-negotiable.
- Lane 5 (SEO) ALWAYS keeps `seo-daily` (mandatory).

═══ STEP 3 — Discipline ═══
- Drop entries older than 14d unless still active (replace, not accumulate).
- ≤200 lines total — if you hit the cap, drop the lowest-confidence entries first.
- Be specific. "Avoid mock tests" beats "be careful with tests."
- No emojis except memory anchors that already use them.

═══ STEP 4 — Cap + finish ═══
PER-LANE CAP: 1 file (only `docs/nightly/learnings.md`).

DO NOT COMMIT. DO NOT PUSH.

═══ STEP 5 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 6 — Self-learn
- Learnings rewritten (lines: <n>)
- New "what works": <count>
- New "what to avoid": <count>
- Carried forward: <count>
```
