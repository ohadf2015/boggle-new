---
status: shipped
files_touched:
  - docs/nightly/ideas/2026-05-30.md
  - docs/nightly/ideas/2026-05-30-reddit.md
  - docs/nightly/reports/2026-05-30.md (appended)
  - docs/nightly/artifacts/lane-04-competitor-2026-05-30.md (this file)
next_steps: |
  Reddit OAuth migration is the #1 blocker (3rd blocked night).
  30-min fix: create script app at reddit.com/prefs/apps, add REDDIT_CLIENT_ID/SECRET/USERNAME/PASSWORD to nightly env,
  update reddit-fetch.sh with OAuth token exchange (oauth.reddit.com endpoint).
  Tonight's top idea (Language Family Classification Layer) and two polish ideas
  (Sealed Bid share card, Word Alchemy wildcard catalyst) are ready for lane 05 pickup
  if founder taps "Try" on Telegram cards.
---

## Summary

- **Reddit**: Fully blocked (3rd night). JSON API returns HTML for all UA variants (custom app UA, python-requests, browser UA). OAuth credentials needed. Prepared drafts written for "browser word game" and "multilingual/non-English" thread types — ready to post when access returns.
- **Competitor research**: 5 concepts surfaced from 6 sources (Ribbit, Wordbound, Wordio, Poki, GridGenius, Nanagrams).
  - Hot trend: **secret/hidden scoring mechanics** (Ribbit's frenzy, Wordbound's object-transform reveal). Both went viral via the *discovery moment*, not the rules.
  - Market gap: **multilingual/non-Latin script word games** still near-empty in the daily-puzzle format.
- **Top idea**: Language Family Classification Layer — 1-tap etymology challenge before scoring; M effort; fits LexiClash's multilingual DNA directly.
- **Polish ideas**: Sealed Bid share card (social-share hook) + Word Alchemy wildcard catalyst (variable-reward hook).
