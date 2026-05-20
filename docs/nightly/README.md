# Nightly Improvement Loop — Ops Guide

Spec: [`docs/specs/nightly-loop.md`](../specs/nightly-loop.md)

## What runs
launchd `com.claude.nightly-loop` at 00:00 local fires `scripts/nightly/run.sh` which sequences 6 lanes (Triage → Engagement → Competitor → Landing → SEO → Self-learn), gates on build/lint/test, single-commits, pushes master, spawns a 30-min health monitor, Telegrams a digest.

## First-time setup

1. Install secrets — easiest path is the interactive setup:
   ```bash
   ./scripts/nightly/setup.sh
   ```
   It auto-detects values from `fe-next/.env.local` where possible, prompts for the rest, writes `~/.config/lexi-nightly/env` with chmod 600, and offers a Telegram smoke-test.

   Manual fallback: `cp config/lexi-nightly.env.example ~/.config/lexi-nightly/env && chmod 600 ~/.config/lexi-nightly/env && $EDITOR ~/.config/lexi-nightly/env`

2. Verify MCPs:
   ```bash
   claude mcp list | grep -E "posthog|supabase|sentry"
   # all three must show ✓ Connected
   ```

3. Create Telegram bot (BotFather → `/newbot`), DM it once, get chat ID:
   ```bash
   source ~/.config/lexi-nightly/env
   curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | jq '.result[-1].message.chat.id'
   ```

4. Smoke-test Telegram:
   ```bash
   ./scripts/nightly/lib/telegram.sh msg "nightly-loop smoke test ✓"
   ```

5. Dry-run:
   ```bash
   ./scripts/nightly/run.sh --dry-run
   ```
   Inspects log at `~/logs/lexi-nightly/run-*.log`. No commits, no push, no Telegram.

6. Load launchd:
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.claude.seo-daily.plist 2>/dev/null
   rm -f ~/Library/LaunchAgents/com.claude.seo-daily.plist
   cp scripts/nightly/com.claude.nightly-loop.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.claude.nightly-loop.plist
   ```

## CLI

| Command | Purpose |
|---|---|
| `./scripts/nightly/run.sh` | full run |
| `./scripts/nightly/run.sh --dry-run` | no commits/push/Telegram |
| `./scripts/nightly/run.sh --only=5` | run one lane (1–6) |
| `./scripts/nightly/run.sh --skip=3,4` | exclude lanes |
| `./scripts/nightly/run.sh --no-push` | run + commit, no push |
| `tail -f ~/logs/lexi-nightly/run-*.log` | watch live |
| `launchctl list \| grep nightly` | check loaded |
| `launchctl start com.claude.nightly-loop` | fire manually |

## Read the nightly report
`docs/nightly/reports/YYYY-MM-DD.md` — what ran, what shipped, what was queued for human review, KPI snapshots.

## Where to look when it breaks

| Symptom | Look at |
|---|---|
| Telegram silent at 00:30 | `~/logs/lexi-nightly/launchd-stderr.log` |
| Lane failed | `~/logs/lexi-nightly/run-*.log` → search `LANE n FAILED` |
| Push rejected | Self-heals: `lib/git-ship.sh` excludes volatile generated files + rebases onto origin + retries. Genuine same-file conflicts fail visibly (Telegram names the file, local commit kept, tree clean). Verify the logic any time you touch it: `bash scripts/nightly/test/git-ship.test.sh` (5 real-git scenarios, must be ALL GREEN) |
| Build failed twice | The night's report writes `RUN-FAILED` and lists the error; lane diffs were not committed |
| Sentry/PostHog spike alert at 00:45 | Background `health-monitor.sh` flagged >2× baseline; `git log -1` + `git revert` if needed |
| MCP "Needs authentication" | Re-auth via Claude Code interactively: `claude` then `/mcp` |

## Self-learning
Lane 6 rewrites `learnings.md` each night from the prior 7 reports. Stays ≤200 lines (rotates stale items). All lane prompts inject `learnings.md` as preamble — yesterday's wins shape tonight's strategy.

## Killswitch
```bash
launchctl unload ~/Library/LaunchAgents/com.claude.nightly-loop.plist
```
or set `NIGHTLY_DISABLED=1` in `~/.config/lexi-nightly/env`.
