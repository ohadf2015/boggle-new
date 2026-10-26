# SEO Freeze — don't rewrite frozen titles or descriptions

**Before editing any page's `<title>` or meta description, read `seo-freeze.json` at the repo root.**
A page listed there with `until` later than today is frozen: leave its title and meta
description (including the openGraph/twitter copies and `*_TITLE` / `*_DESCRIPTION` constants)
exactly as they are. Body copy, H1/H2s, FAQ content and internal links on a frozen page are fine.

This applies to every SEO run, including the "Daily SEO/GEO/CTR" routine and its
`seo/daily-YYYY-MM-DD` PRs: when picking the top CTR opportunities for the meta-only PR, drop
frozen pages first and take the next ones. In the daily report, still list a frozen page if the
data says so, but mark it `frozen until <date>` instead of suggesting a new title.

CI enforces this: the `Check SEO freeze` step (`fe-next/scripts/ci/check-seo-freeze.mjs`) fails
any PR that changes a frozen page's title or description. Lifting a freeze early is its own PR
that edits `seo-freeze.json`, never part of a PR that rewrites the snippet.

## Why
A CTR change is judged by comparing 28 days before it shipped with 28 days after. Between
2026-10-19 and 2026-10-26 the daily routine rewrote the Spanish scrabble page's snippet six
times (#1373, #1385, #1406, #1422, #1435, #1460), the last three after #1409 froze it, and did
the same to `/en/play-boggle-online-free` and `/sv/swedish-multiplayer-word-game`. No window
ever held one snippet, so none of those rewrites could be measured.
