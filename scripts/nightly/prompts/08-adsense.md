You are running the nightly **AdSense-approval** lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new. Be terse, act fast.

Mission: incrementally raise the site toward Google AdSense approval (rejected 2026-05-11 for "Low value content"). You do this by strengthening **non-game informational pages**, fixing **real thinness/SSR bugs**, and improving **crawl + structure** — WITHOUT bloating word counts and WITHOUT touching game pages. Quality over quantity. One or two real improvements per night beats a wall of filler.

═══ LEARNINGS FROM PRIOR RUNS (preamble — apply throughout) ═══
__LEARNINGS__

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above (if present), invoke the skills listed for **lane 08 adsense**. Otherwise: `geo-content` (E-E-A-T depth on informational pages), `humanizer` (run on ANY new prose so it has no AI-tells — Google's Helpful Content classifier penalizes AI filler), `ux-writer` (locale parity). Do NOT use frontend-design/animate-ai here — this lane is content + crawl, not visual redesign.

═══ NON-NEGOTIABLE GUARDRAILS (the whole point of this lane) ═══
These override any "more content = better" instinct. Violating any one = revert that edit.

1. **NEVER add text to GAME pages.** Hard ban on Write/Edit to any file under these routes:
   `/multiplayer`, `/daily`, `/daily/*`, `/blast`, `/adventure`, `/adventure/*`, `/brain`, `/brain/*`, `/practice`, `/practice/*`, `/party`, `/party/*`, `/community/*`, `/quests`, `/student/*`, `/teacher/*`, `/education/duels`, `/education/classroom-game`, `/connections/play`, `/anagram`, `/anagram/*`, `/join/*`, `/challenge/*`, `/friend-challenge/*`, `/profile`, `/settings`, `/friends`, `/custom/*`, `/word-of-the-day` (and `/word-of-the-day/*`).
   If a route is not CLEARLY informational, treat it as a game page and leave it alone.
   Do NOT expand the existing `sr-only` `GamePageSeoContent` on `/anagram`, `/multiplayer`, `/word-of-the-day` (committed in `6cec0b638`) — leave as-is; it stays per a forward-only reading of the constraint.

2. **NO bloat / word-count padding.**
   - Any single informational-page edit may add **at most ~200 words** of human-quality prose. No "10 features + 8 FAQ" walls.
   - A NEW informational page must be **≤1500 words** and exist for a real query/user need — never as a doorway.
   - If you cannot make a page genuinely more useful in ≤200 words, DON'T edit it. A page can be short and high-value.

3. **NO new programmatic / scaled pages.** Do not create or expand templated page families (`/words/[n]-letter-words`, `/words/starting-with/*`, `/anagram/[letters]` seeds, comparison templates). Scaled thin pages are a primary AdSense "low value" trigger — adding more makes approval LESS likely.

4. **Locale parity.** Any user-facing string edit must land in all 5 locales (en, he, sv, ja, es) via `fe-next/messages/*.json` / `t()`. Hebrew RTL-safe. Non-English AI-drafted → flag "needs native review". Never leave raw keys.

5. **Do NOT:** enable `NEXT_PUBLIC_H5_ADS_ENABLED`; modify `fe-next/public/ads.txt`; re-submit AdSense (operator does that manually); add fake `aggregateRating`/stats; use negative framing ("0 ads"). JSON-LD ONLY via `components/seo/*` wrappers (pre-commit hook blocks raw script injection).

6. **No overlap with lane 6 (SEO).** Run `git diff --name-only` first. Do NOT edit any file lane 6 already touched tonight.

═══ STEP 1 — Live word-count audit (what Googlebot actually sees) ═══
Run this against PRODUCTION (not localhost) and record results:
```bash
for url in /en /ja /sv /es /he /en/about /en/contact /en/blog /en/faq /en/how-to-play /en/rules /en/glossary /en/guides /en/leaderboard /en/legal/privacy /en/legal/terms /en/education /en/tools/word-solver; do
  c=$(curl -sL --max-time 25 -H "User-Agent: Googlebot" "https://www.lexiclash.live$url" | python3 -c "
import re,sys
h=sys.stdin.read()
h=re.sub(r'<script[^>]*>.*?</script>','',h,flags=re.DOTALL)
h=re.sub(r'<style[^>]*>.*?</style>','',h,flags=re.DOTALL)
t=re.sub(r'<[^>]+>',' ',h)
print(len(re.sub(r'\s+',' ',t).split()))" 2>/dev/null)
  printf '%-34s %s\n' "$url" "${c:-FAIL}"
done
```
CJK note: the tokenizer splits on whitespace, so Japanese (`/ja`) under-counts massively and is NOT reliable evidence of thinness — verify `/ja` by eyeballing the SSR HTML for real `<h1>/<p>` Japanese text before treating it as thin. A 162-word `/ja` reading in the past was a tokenizer artifact, not a bug.

Flag genuinely thin INFORMATIONAL pages (<300 words AND not game pages AND not CJK-artifact). These are your candidates.

═══ STEP 2 — GSC traffic check (decide keep vs noindex; needs gcloud ADC) ═══
If `$HOME/.config/gcloud/application_default_credentials.json` exists, lane 6 wrote `docs/seo-daily/__TODAY__.md` earlier tonight — read it for per-URL clicks/impressions (28d).
- A thin page that DOES earn clicks/impressions → improve it (≤200 words) or leave it; do NOT noindex.
- A thin programmatic/utility page with **~0 clicks AND ~0 impressions over 28d** is dead weight dragging site quality → consider `robots: { index: false }` on it (this REMOVES low-value pages from Google's view, which helps AdSense more than padding them). Cap noindex actions at **5 pages/night** and list each in the report.
If GSC data is unavailable, SKIP all noindex decisions this night (never blind-noindex) and work only from word counts + structure.

═══ STEP 3 — Pick AT MOST 2 actions tonight (cap hard) ═══
Choose up to two, highest-leverage first. Prefer fixing a real defect over writing copy.
- **Real SSR/thinness defect** on an informational page (content present in source but missing from SSR HTML) → fix the render bug. Highest priority.
- **A genuinely thin informational page** that earns traffic → add ≤200 words of real, specific, useful prose (run `humanizer`).
- **Internal-linking / discoverability**: add 2-3 contextual links from strong pages (blog/about/education) to under-linked valuable pages. Zero new prose, big crawl value.
- **Structure**: add missing `BreadcrumbList`/`FAQPage`/`Article` JSON-LD via `components/seo/*` wrappers to an informational page that lacks it.
- **Noindex up to 5 dead thin pages** (only with GSC zero-traffic evidence from Step 2).
- **Required-page completeness**: ensure About/Contact/Privacy/Terms are reachable and substantive (they already are — only act if a regression appears).

If nothing clears the bar tonight, do NOTHING and say so in the report. A no-op night is a valid, correct outcome for this lane.

═══ STEP 4 — Edit safely (HARD RULES recap) ═══
  • Re-read GUARDRAILS above before every edit. Game-page ban + ≤200-word cap + locale parity are absolute.
  • Run `humanizer` on every new sentence of prose.
  • JSON-LD via `components/seo/*` wrappers only.
  • New routes (only if a ≤1500-word non-doorway informational page) → update `fe-next/app/sitemap.ts` and, if AI-discoverable, `fe-next/public/llms.txt`.
  • Grep existing i18n keys before creating new ones.

═══ STEP 5 — Cap + finish ═══
PER-LANE CAP: __PER_LANE_CAP__ files (orchestrator auto-reverts the whole lane if exceeded). Stay well under — this lane should rarely touch more than 3-4 files.

DO NOT COMMIT. DO NOT PUSH. The orchestrator (`scripts/nightly/run.sh`) runs the lint/test/build gate and commits + pushes once for all lanes.

═══ STEP 6 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 8 — AdSense approval
- Live word-count audit: <thinnest 3 informational pages + counts, or "site unreachable">
- Action(s) taken: <≤2, or "no-op — nothing cleared the quality bar tonight">
- Files edited: <list, or none>
- Noindexed (zero-traffic dead pages): <list with 28d clicks/impr, or none>
- Locales needing native review: <list>
- AdSense readiness note: <one line — what still blocks approval / when to consider re-submitting>
```
