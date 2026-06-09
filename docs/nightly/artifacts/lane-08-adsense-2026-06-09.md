status: shipped
attempted: word-count audit on prod informational pages, GSC dead-page scan, noindex 4 zero-traffic /words/starting-with/* letters
files_touched:
  - fe-next/app/[locale]/words/starting-with/[letter]/page.tsx
next_steps: re-run dead_pages.py in ~7 days to see if noindexed letters drop from GSC coverage; check /en/guides (616 words) for thin-content improvement if it earns clicks
