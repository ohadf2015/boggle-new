---
status: shipped
attempted: word-count audit → fix locale parity on /guides hub page (thin FAQ + features for he/sv/ja/es) + add visible generalTips paragraph to all 5 locales
files_touched:
  - fe-next/app/[locale]/guides/PageClient.tsx
  - fe-next/app/[locale]/guides/page.tsx
next_steps: |
  - Re-audit /en/guides word count after deploy (expected: ~540-580 vs 430 today)
  - Consider adding 1 more FAQ to EN (game length info) to push past 600
  - /en/leaderboard (606 words) borderline — check GSC for traffic before acting
  - NoIndex decisions deferred: no explicit GSC per-URL data (ADC lacks webmasters.readonly)
  - AdSense: main remaining blocker = GSC scope fix (interactive gcloud auth needed)
---
