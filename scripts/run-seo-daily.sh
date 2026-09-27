#!/bin/bash
# Daily SEO Auto-Ship
# Pulls GSC + Bing data, edits closest landing pages or ships a new one,
# runs lint/test/build, and ships a dated PR from a branch reset to origin/master.
#
# Usage:  ./scripts/run-seo-daily.sh
# Cron:   loaded via ~/Library/LaunchAgents/com.claude.seo-daily.plist (optional)
#
# Hard stops:
#  - dirty git tree
#  - missing GSC or Bing creds
#  - unable to close superseded seo/daily PRs
#  - >8 files changed (sanity cap)
#  - lint/test/build fails after 2 fix attempts
#  - self-audit flags fabricated content

set -uo pipefail

PROJECT_DIR="/Users/ohadfisher/git/boggle-new"
LOG_DIR="$HOME/logs/claude-seo"
DATE_TAG="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/seo-daily-$DATE_TAG.log"
TODAY="$(date +%Y-%m-%d)"
BASE_BRANCH="master"
BRANCH="seo/daily-$TODAY"
PR_PREFIX="seo/daily-"

GSC_SITE="${GSC_SITE:-sc-domain:lexiclash.com}"
BING_SITE="${BING_SITE:-https://lexiclash.com/}"

mkdir -p "$LOG_DIR"

log() { echo "$@" | tee -a "$LOG_FILE"; }

close_superseded_prs() {
  local keep_branch="$1"
  local prs pr stale_branch

  if ! command -v gh >/dev/null 2>&1; then
    log "ERROR: gh CLI is required to close superseded ${PR_PREFIX}* PRs"
    return 1
  fi

  if ! prs="$(gh pr list --state open --limit 100 --json number,headRefName \
    --jq '.[] | select(.headRefName | startswith("'"$PR_PREFIX"'")) | select(.headRefName != "'"$keep_branch"'") | [.number, .headRefName] | @tsv')"; then
    log "ERROR: unable to list open ${PR_PREFIX}* PRs"
    return 1
  fi

  if [ -z "$prs" ]; then
    log "No superseded ${PR_PREFIX}* PRs open"
    return 0
  fi

  while IFS=$'\t' read -r pr stale_branch; do
    [ -n "$pr" ] || continue
    log "Closing superseded SEO PR #$pr ($stale_branch)"
    if ! gh pr close "$pr" --comment "Superseded by \`$keep_branch\` — closing this stale SEO PR so only the fresh origin/$BASE_BRANCH-based run stays open."; then
      log "ERROR: failed to close superseded SEO PR #$pr"
      return 1
    fi
  done <<< "$prs"
}

sync_current_pr_branch() {
  local ahead

  ahead="$(git rev-list --count "origin/$BASE_BRANCH..$BRANCH")"
  if [ "$ahead" = "0" ]; then
    log "No commits on $BRANCH — empty night, no PR to sync"
    return 0
  fi

  log "Syncing $BRANCH onto latest origin/$BASE_BRANCH..."
  git fetch origin "$BASE_BRANCH" 2>&1 | tee -a "$LOG_FILE" || return 1

  if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    git fetch origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE" || return 1
    if ! git merge-base --is-ancestor "$BRANCH" "origin/$BRANCH"; then
      git push origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE" || return 1
    fi
  else
    git push -u origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE" || return 1
  fi

  git fetch origin "$BASE_BRANCH" "$BRANCH" 2>&1 | tee -a "$LOG_FILE" || return 1
  git checkout -q -B "$BRANCH" "origin/$BRANCH" || return 1
  if ! git rebase "origin/$BASE_BRANCH" 2>&1 | tee -a "$LOG_FILE"; then
    git rebase --abort >/dev/null 2>&1 || true
    log "ERROR: rebase of $BRANCH onto origin/$BASE_BRANCH conflicted"
    return 1
  fi

  if ! git diff --quiet "origin/$BRANCH" "$BRANCH"; then
    git push --force-with-lease origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE" || return 1
  fi

  if ! gh pr view "$BRANCH" >/dev/null 2>&1; then
    gh pr create \
      --base "$BASE_BRANCH" \
      --head "$BRANCH" \
      --title "seo: daily landing improvements $TODAY" \
      --body "Automated daily SEO improvements for $TODAY. See the branch commits for exact changes and validation notes." \
      2>&1 | tee -a "$LOG_FILE" || return 1
  fi
}

log "========================================"
log "SEO Daily Auto-Ship :: $(date)"
log "Site: $GSC_SITE | Bing: $BING_SITE"
log "========================================"

cd "$PROJECT_DIR" || { log "ERROR: cd $PROJECT_DIR failed"; exit 1; }

[ -f "$HOME/.config/gcloud/application_default_credentials.json" ] || {
  log "ERROR: gcloud ADC missing. Run: gcloud auth application-default login --scopes=...,webmasters.readonly"
  exit 1
}
[ -f "$HOME/.config/bing-wmt/credentials" ] || {
  log "ERROR: Bing WMT creds missing at ~/.config/bing-wmt/credentials"
  exit 1
}

if ! git diff --quiet || ! git diff --cached --quiet; then
  log "ERROR: working tree dirty. Commit or stash first."
  git status --short | tee -a "$LOG_FILE"
  exit 1
fi

log "Fetching latest origin/$BASE_BRANCH and resetting $BRANCH..."
git fetch origin "$BASE_BRANCH" 2>&1 | tee -a "$LOG_FILE" || {
  log "ERROR: git fetch origin $BASE_BRANCH failed"
  exit 1
}

# Always start today's work branch from the freshest protected base. This is the
# invariant that prevents a new seo/daily PR from being opened on stale master.
git checkout -q -B "$BRANCH" "origin/$BASE_BRANCH" || {
  log "ERROR: unable to reset $BRANCH onto origin/$BASE_BRANCH"
  exit 1
}
log "Work branch $BRANCH reset to origin/$BASE_BRANCH"

if ! close_superseded_prs "$BRANCH"; then
  log "ERROR: refusing to run while superseded SEO PRs may still be open"
  exit 1
fi

PROMPT_FILE="$(mktemp -t seo-daily-prompt.XXXXXX)"
trap 'rm -f "$PROMPT_FILE"' EXIT

cat > "$PROMPT_FILE" <<'PROMPT_EOF'
You are running the daily SEO auto-ship loop for LexiClash. Today: __TODAY__.
Working dir: /Users/ohadfisher/git/boggle-new. Stay terse, act fast.
Current branch: `seo/daily-__TODAY__`, already reset to `origin/master` by the wrapper. Stay on this branch.

═══ STEP 1 — Pull data ═══
Invoke the `seo-daily` skill with these inputs:
  --site sc-domain:lexiclash.com
  --bing-site https://lexiclash.com/
  --repo /Users/ohadfisher/git/boggle-new
  --days 28
  --no-pr            (report only; the wrapper manages the dated PR branch)

This writes docs/seo-daily/__TODAY__.md. Read it.

═══ STEP 2 — Self-audit the site BEFORE picking targets ═══
You MUST ground every claim in real product features. Survey the site:
  • Read fe-next/app/sitemap.ts to know what routes exist.
  • Read fe-next/public/llms.txt for the canonical product description.
  • Skim fe-next/app/[locale]/page.tsx (homepage) and 2-3 mode pages (e.g. multiplayer, daily, adventure) to learn ACTUAL feature names, modes, capacities, languages supported.
  • Build a one-paragraph "ground truth" note in your scratchpad: what LexiClash actually is, what modes exist, what languages are supported (en/he/sv/ja/es), real player-facing facts only.

NEVER write content that contradicts ground truth. If unsure → check the code before writing the copy.

═══ STEP 3 — Pick targets (cap totals) ═══
From today's report, pick UP TO:
  • 3 CTR opportunities (meta/title/description fixes)
  • 2 rank-up opportunities (pos 8–25; expand H2 + add 2–3 internal links)
  • 1 NEW landing page (only if a high-intent query >50 impr/28d has NO good page)

SKIP an opportunity if any of:
  • Existing meta already contains the target query verbatim (cosmetic only)
  • Brand-only term ("lexiclash") — no SEO win
  • Query intent doesn't match a real LexiClash feature (would force fabrication)

═══ STEP 4 — Multi-locale by default ═══
Every NEW landing page and every new translation key MUST exist in ALL 5 locales: en, he, sv, ja, es.
  • Page route lives at fe-next/app/[locale]/<slug>/page.tsx (single file, locale-aware via t()).
  • Strings go in fe-next/messages/{en,he,sv,ja,es}.json.
  • Hebrew strings need RTL-safe phrasing (no LTR-only punctuation tricks).
  • HE/JA/SV/ES are AI-generated by you — flag them in the commit body for native review (`feedback-check-existing-i18n-keys` / `feedback-copy-trim-style` from MEMORY apply).
  • EXCEPTION: if the query intent is purely English (e.g. "esl word games"), use the locale-gate pattern instead — see `fe-next/app/[locale]/lexiclash-vs-wordwall/page.tsx` for the `isTargetLocale` + `META_FALLBACK` shape (English content + `robots: { index: false }` on non-English locales).

═══ STEP 5 — Edit safely ═══
MUST follow:
  • JSON-LD only via `components/seo/*` wrappers (BreadcrumbJsonLd, VideoGameJsonLd, FAQ wrappers). NEVER raw HTML script-injection props (pre-commit hook blocks them).
  • Truthful stats only — NO fake `aggregateRating` JSON-LD or fabricated player counts / star ratings (project rule).
  • Positive framing — never write "0 downloads" / "0 ads"; use "browser-based" / "ad-free" / "free".
  • Reuse existing i18n keys — grep `errors.*` etc before creating new ones.
  • If creating a new route: update `fe-next/app/sitemap.ts` AND `fe-next/public/llms.txt` if AI-discoverable.

CONTENT AUDIT (run mentally before saving each file):
  1. Is every feature/mode/number I named real? (cross-check against ground-truth note)
  2. Is every locale string a faithful translation, not a literal English calque?
  3. Did I avoid puffery ("best", "millions", "#1") unless GSC data backs it?
  4. Does the meta description front-load the target query in the user's language?
If any answer is no → fix before continuing.

═══ STEP 6 — Validate ═══
cd fe-next
npm run lint
npm run test
npm run build

If any fails: read the error, fix root cause, retry ONCE. Still failing → HARD STOP, write `docs/seo-daily/__TODAY__-FAILED.md` with the error, do not commit, exit non-zero.

═══ STEP 7 — Sanity cap + commit + push PR branch ═══
Run `git diff --stat` and count touched files. If >8 files → HARD STOP (probably ran wild). Print the diff stat and exit without committing.

Otherwise (only files you intentionally changed; never `git add -A`):
  git add <list>
  git commit -m "feat(seo): daily landing improvements __TODAY__

  Changes:
  - <query> → <page> → <fix type> (impr=N, pos=X, expected uplift)
  - ...

  AI-generated translations needing native review: he, ja, sv, es
  (only list locales actually touched)

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  git push -u origin seo/daily-__TODAY__

Open a ready PR if one does not already exist:
  gh pr create --base master --head seo/daily-__TODAY__ \
    --title "seo: daily landing improvements __TODAY__" \
    --body "Automated daily SEO improvements for __TODAY__. See commit body for query-level rationale and validation notes."

Do NOT push to master and do NOT merge the PR. The wrapper rebases the branch onto latest origin/master and closes superseded seo/daily PRs.

═══ STEP 8 — Summary ═══
Final stdout (concise):
  • Report path: docs/seo-daily/__TODAY__.md
  • Files changed: <count>
  • Commit pushed: <sha or "none"> on `seo/daily-__TODAY__`
  • PR: <url or "existing PR">
  • Top 3 changes with expected CTR/rank uplift
  • Locales needing native review

═══ NON-NEGOTIABLES ═══
  • Stay on `seo/daily-__TODAY__`; never switch to or push master.
  • NO test mocking, lint suppression, or `--no-verify`.
  • NO new files outside the approved landing page + its translation entries.
  • NO fabricated features, stats, modes, or testimonials.
  • If unsure → write `docs/seo-daily/__TODAY__-NOTES.md` and skip the edit.
PROMPT_EOF

# Substitute __TODAY__ in place
sed -i '' "s/__TODAY__/$TODAY/g" "$PROMPT_FILE"

log "Launching headless Claude session..."
log "Prompt size: $(wc -c < "$PROMPT_FILE") bytes"
log "----------------------------------------"

claude -p "$(cat "$PROMPT_FILE")" \
  --allowedTools '*' \
  --dangerously-skip-permissions \
  2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}

log "----------------------------------------"
log "Completed: $(date) | exit=$EXIT_CODE"
log "----------------------------------------"

if [ "$EXIT_CODE" -eq 0 ]; then
  if ! sync_current_pr_branch; then
    log "ERROR: unable to sync today's SEO PR branch onto origin/$BASE_BRANCH"
    EXIT_CODE=1
  fi
  if ! close_superseded_prs "$BRANCH"; then
    log "ERROR: unable to close superseded SEO PRs after today's run"
    EXIT_CODE=1
  fi
else
  log "Skipping PR branch sync because Claude exited non-zero"
fi

# Leave the shared checkout on the protected base, never on the dated PR branch.
git fetch origin "$BASE_BRANCH" 2>&1 | tee -a "$LOG_FILE" || true
git checkout -q "$BASE_BRANCH" 2>/dev/null || true
git reset --hard "origin/$BASE_BRANCH" 2>&1 | tee -a "$LOG_FILE" || true

LOCAL_SHA="$(git rev-parse "$BASE_BRANCH")"
REMOTE_SHA="$(git ls-remote origin "$BASE_BRANCH" | awk '{print $1}')"
if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  log "Base branch local==remote @ $LOCAL_SHA"
else
  log "WARN: base local=$LOCAL_SHA remote=$REMOTE_SHA — checkout restore may have failed"
fi

ls -t "$LOG_DIR"/seo-daily-*.log 2>/dev/null | tail -n +31 | xargs -r rm

exit $EXIT_CODE
