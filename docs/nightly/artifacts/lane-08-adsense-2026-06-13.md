---
status: shipped
attempted: Live word-count audit on informational pages, GSC dead-page check, add FAQPage JSON-LD + ISR revalidation to /rules
files_touched:
  - fe-next/app/[locale]/rules/page.tsx
next_steps: |
  - Wait 7-10 days for crawl warm-up on new FAQPage rich snippet signals
  - Re-check if Google has indexed the FAQPage schema for /en/rules rich results
  - Consider re-submitting AdSense after crawl warms (~7d from this deploy)
  - No dead pages remain to noindex in words/starting-with (c/f/y already handled in prior run)
  - Monitor /en/guides (616w) — could benefit from 1-2 more FAQ items if engagement shows gaps
---
