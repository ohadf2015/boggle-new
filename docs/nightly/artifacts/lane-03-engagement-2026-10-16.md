status: shipped
attempted: PostHog flag hygiene sweep + propose exp targeting rageclick on education/esl-word-games es page, add instrumentation gaps.
files_touched: fe-next/lib/experiments.ts, fe-next/components/education/EducationLandingDemo.tsx, docs/nightly/impact-ledger.ndjson, docs/nightly/reports/2026-10-16.md
next_steps: wire exp-practice-wheel-cta-v1 (still 0 call sites) if it's ever in scope; re-check exp-edu-demo-interrupt-v1 rage-click delta after 7 days (check_after_days=7 in impact-ledger); no decided flags found this run — revisit flag-hygiene goal once per-flag experiment-result data is queryable from the brief.
