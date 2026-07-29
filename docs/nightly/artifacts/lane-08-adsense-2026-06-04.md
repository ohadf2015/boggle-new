status: shipped
attempted: Add Article JSON-LD (author + dateModified E-E-A-T signals) to all 3 guide sub-pages
files_touched:
  - fe-next/app/[locale]/guides/classic-strategy/page.tsx
  - fe-next/app/[locale]/guides/blast-strategy/page.tsx
  - fe-next/app/[locale]/guides/word-hunt-strategy/page.tsx
next_steps: >
  Add CollectionPage JSON-LD to guides hub (guides/page.tsx) — skipped due to time.
  After archive-noindex + sitemap-shrink + HomepageContentSection land tonight (all in
  working tree), wait ~1-3w for GSC recrawl, then check indexed count drops from ~1750.
  Re-submit AdSense only after GSC shows indexed pages < ~500 and thin-page ratio improves.
  GSC ADC scope (webmasters.readonly) still missing — fix to unblock per-URL traffic data.
