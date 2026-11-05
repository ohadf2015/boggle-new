status: research-only
attempted: live word-count audit prod + GSC dead-page check + at most 2 informational-page/crawl fixes within guardrails
files_touched: none
next_steps: no-op night — all candidate fixes already shipped by prior lanes. Nothing new to pick up tomorrow unless word counts/GSC data shift. Lane 7: the `DEAD_LETTERS` set in app/[locale]/words/starting-with/[letter]/page.tsx:27 is unused dead code (whole family already blanket noindex:false since 2026-08-09) — safe cleanup candidate for a code-hygiene lane, not this one.
