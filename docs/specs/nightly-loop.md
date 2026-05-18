# Nightly Autonomous Improvement Loop — Spec

Status: **shipping** · Owner: ohadfisher · Triggers: macOS launchd 00:00 local

## Goal
Every night, autonomously improve LexiClash across error-rate, engagement, UX, content, and SEO — push to master, alert via Telegram. Get better at this over time.

## Scope (7 lanes, sequential)

| # | Lane | Model | Inputs (read) | Outputs (write) | Per-lane diff cap |
|---|---|---|---|---|---|
| 1 | **Triage** | sonnet | sentry MCP, supabase MCP advisor, posthog MCP `$exception` | root-cause fixes; security-adjacent → human queue | 8 files |
| 2 | **Performance** | sonnet | `db_perf_top_query_audit`, `pg_stat_statements`, posthog `$web_vitals` (LCP/INP/CLS) p75, bundle sizes vs `perf-baseline.json` | indexes (advisor-justified only), N+1 fixes, image priority/dimensions, dynamic imports for below-fold heavy chunks; rewrites `perf-baseline.json` | 8 files |
| 3 | **Engagement A/B + flag hygiene** | sonnet | posthog funnels last 24h vs 7d baseline | new typed experiment behind flag; remove decided flags (≥7d, p<0.05, n≥1000); add analytics for next-day insight | 8 files |
| 4 | **Competitor + Reddit** | sonnet | Firecrawl r/wordgames, r/dailygames /top/week + top portals | `docs/nightly/ideas/YYYY-MM-DD.md` backlog + reply drafts (no code) | 2 files |
| 5 | **Landing/CVR** | opus | posthog landing conversion 14d; ground-truth audit (sitemap, llms.txt) | one landing variant behind `landing_variant_v{n}`, 5 locales, `frontend-design` + `animate-ai` skills | 8 files |
| 6 | **SEO/GEO** | sonnet | GSC + Bing WMT 28d | invokes existing `seo-daily` skill `--no-pr` | 8 files |
| 7 | **Self-learn** | opus | last 7 reports + commit outcomes | rewrites (not appends) `docs/nightly/learnings.md` ≤200 lines | 1 file |

Sequential because lanes 1/2/4/5 all touch `fe-next/**`. Parallel = file stomps (memory: `feedback-parallel-agents-overlap`).

## Integration step (after all lanes)
1. Total diff sanity cap **30 files** (each lane already ≤8).
2. `cd fe-next && npm run lint && npm run test && npm run build:fast` — retry once on fail; HARD-STOP on second fail.
3. Single end-of-run commit listing all lanes (advisor: per-lane commits = many rollback targets + many Railway deploys).
4. `git push origin master` (project pref: direct master, no PR).
5. Spawn background `health-monitor.sh` — watches PostHog `$pageview` last 60min and Sentry `event_count` last 15min for **30 min post-push**, Telegrams if >2× baseline.
6. **Manager summary** (Sonnet, ≤4 min budget, ~$0.01/run): reads `docs/nightly/reports/$TODAY.md` and composes a narrative ≤1200-char Telegram message with TL;DR / Key wins / Concerns / Tomorrow. Sent via `sendMessage` BEFORE the full-report `sendDocument`. Fallback on timeout: tactical headline. Founder reads the summary in 20 seconds, opens the attachment only when something looks off.

## Safety
- **Lock file** `~/.cache/lexi-nightly.lock` with `pid + mtime`; ignore lock if pid dead OR mtime >2h (crashed run).
- **Preflight** (any fail → abort, Telegram): clean working tree, on master, ff-only pull, MCPs alive (`claude mcp list`), required env present.
- **Hard wall clock** 60 min (launchd `TimeOut: 3600`).
- **No auto-rollback** — alert-and-queue. Railway deploy 2–5 min lag makes post-push KPI checks unreliable; human decides at 09:00 with morning Telegram.
- **No symptom silencing** (memory: `feedback-no-symptom-silencing`) — triage prompt hard-bans `logger.warn→debug` demotions and Sentry threshold raises.
- **Truthful stats only** (memory: `feedback-no-fake-ratings`, `feedback-positive-stat-framing`) — landing/SEO lanes inherit ground-truth audit.
- **No new realtime tables without consumer** (`.claude/rules/50-supabase-perf.md`) — engagement lane prompt embeds rule.
- **Build/lint/test = shell exit code, not Claude's stdout claim** (memory: `feedback-subagent-verify-claims`).

## Headless Claude invocation
`claude -p "$prompt" --allowedTools '*' --dangerously-skip-permissions --model {sonnet|opus}`. Skills auto-load via Skill tool — proven by existing `run-seo-daily.sh`.

## Files
```
~/Library/LaunchAgents/com.claude.nightly-loop.plist          # 00:00 trigger
~/.config/lexi-nightly/env                                    # secrets (not in repo)
scripts/nightly/run.sh                                        # orchestrator
scripts/nightly/lib/{preflight,headless,telegram,health-monitor}.sh
scripts/nightly/lanes/0{1..6}-*.sh
scripts/nightly/prompts/0{1..6}-*.md
docs/nightly/README.md                                        # ops guide
docs/nightly/learnings.md                                     # rewritten nightly by lane 6
docs/nightly/reports/YYYY-MM-DD.md                            # nightly digest
docs/nightly/ideas/YYYY-MM-DD.md                              # lane 3 idea backlog
config/lexi-nightly.env.example                               # env template
```

## Required secrets in `~/.config/lexi-nightly/env`
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
FIRECRAWL_API_KEY=                # optional — lane 3 skips if missing
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=        # advisor + execute_sql via MCP already configured
```
`gcloud ADC` + `~/.config/bing-wmt/credentials` continue to gate lane 5 (existing).

## Asleep mac
launchd `StartCalendarInterval` 00:00 = **skipped if mac asleep**, no wake. Honest contract: **"fires at 00:00 only; if mac is asleep at midnight that night is silently skipped."** If you need wake-on-trigger, add `StartInterval: 3600` as a second plist and let `preflight.sh`'s 18h dedupe handle duplicate fires — not shipped by default to keep mac-sleep behavior predictable. Preflight writes the last-run timestamp ONLY on successful completion (run.sh end), so aborted runs don't poison the next retry.

## Decommission
- Unload + delete `com.claude.seo-daily.plist` (lane 5 subsumes it).
- Keep `com.claude.sentry-bugs.plist` every 4h — covers in-day spikes lane 1 won't catch until next nightly.

## Out of scope
- Auto-rollback. Auto-merge for security-adjacent. Self-host Firecrawl (use hosted API; skip if missing). New realtime publication adds.
