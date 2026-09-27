status: shipped
files_touched:
  - fe-next/app/[locale]/education/classroom-game/page.tsx
  - docs/nightly/impact-ledger.ndjson

## What was done

### Impact check (mandatory)
Queried `growth:school_lead_submitted` (last 7d) = 0. Event not in PostHog taxonomy at all.
Verdict appended to impact-ledger.ndjson: **neutral** (baseline 0, still 0 — not a regression).

### Root-cause investigation: why 0 school leads
Funnel data (14d):
| Event | Count |
|---|---|
| growth:education_upsell_impression | 45 |
| growth:landing_cta_clicked (any school/district CTA) | 0 |
| growth:school_lead_form_viewed | 1 |
| growth:school_lead_submitted | 0 |

Page traffic (14d):
| Page | Views |
|---|---|
| /education/access | 21 |
| /education/classroom-game | 12 |
| /education/esl-word-games | 8 |
| /education/for-schools | 1 |

Root cause: the for-schools form page gets almost no traffic. The classroom-game page gets 12x more views and already had a CTA, but it used `bg-neo-purple/20` (near-invisible on dark navy) with no click tracking.

### Shipped fix
`classroom-game/page.tsx` for-schools CTA:
- **Before**: `bg-neo-purple/20 border-neo-purple/50` — near-invisible ghost button
- **After**: `bg-neo-lime border-neo-thick` — full design-system primary CTA (lime, neo-brutalist)
- Added `data-ph-capture-attribute-cta="classroom_for_schools"` — PostHog autocapture tracks clicks without client code
- Hover lift + shadow animation added

Lint: clean (0 errors, 0 warnings).

## Next steps
1. After 7 days: check `SELECT count() FROM events WHERE event='$autocapture' AND JSONExtractString(properties,'cta')='classroom_for_schools'` — if still 0, copy/placement needs investigation
2. `/education/esl-word-games` and `/education/vocabulary-games-classroom` (8 + 5 views/14d) have no for-schools CTA — next highest-leverage placement (check Lane 08 boundary before editing)
3. Teacher district banner (45 impressions, 0 clicks) has a visibility/copy problem — consider bolder copy or card layout
4. Revenue snapshot stale — founder should run `scripts/nightly/lib/pull-revenue-snapshot.sh` or provision `ADMOB_API_TOKEN`
