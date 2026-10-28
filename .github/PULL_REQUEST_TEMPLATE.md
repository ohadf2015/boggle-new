## Summary

## Test plan
- [ ] 

## Growth Radar

If this PR should be graded, add one column-0 line per surface, outside any code fence. The push-to-master action records each line (app `lexiclash`, evidence = this PR + the merge sha). Same-day retries are safe. Do not add a line for SEO `radar/*` PRs (those use the ```radar block and are recorded by radar-merged.yml), for docs or refactors, or for a detector opt-out — recording an opt-out grades a fake win.

kind: `ux` (one screen's friction) | `bugfix` (graded on errors) | `feature` (graded on the funnel). metric must be one the scorer reads: `frustration`, `errors`, `funnel_conversion`, `conversions`, plus the SEO metrics when this is not a radar/* PR. surface is a path (`/en/multiplayer`), a template, or `sitewide`. `summary` is optional; the PR title is used when it is omitted.

```
GR-Intervention: surface=/en/multiplayer kind=ux metric=frustration hypothesis="why this metric should move"
```
