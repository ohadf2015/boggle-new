status: research-only
files_touched: none
next_steps: |
  All checked angles came back clean tonight (true no-op, not a skipped audit):
  - Word-count audit (prod, Googlebot UA): every informational page >400 words real text
    (/en 1021, /en/about 1556, /en/faq 906, /en/how-to-play 1181, /en/rules 862,
    /en/glossary 1872, /en/guides 665, /en/leaderboard 437, /en/legal/privacy 2357,
    /en/legal/terms 1158, /en/education 1560, /en/tools/word-solver 1461, /en/contact 786,
    /en/blog 999). /ja read 121w but verified by eyeballing SSR HTML — real Japanese h1/p
    content present, just a tokenizer artifact (CJK has no whitespace), not actually thin.
  - scripts/nightly/tools/dead_pages.py: scanned 403 indexed pages, GSC reachable,
    0 non-banned dead programmatic pages this run. No noindex action.
  - JSON-LD audit (faq/how-to-play/rules/glossary/guides/about/contact/blog/leaderboard/
    tools/word-solver): all already carry FAQPage/BreadcrumbList/DefinedTermSet/HowTo/
    WebApplication via @graph — no missing-structure gap found.
  - Internal linking to /en/education from about/blog/guides/faq: already present on
    every page checked — no discoverability gap to close.
  - SSR spot-check on /en/leaderboard (lowest word count, 437): h2 + content render
    server-side, no CSR-hidden content — not a defect, just a naturally shorter page.
  Tomorrow: re-run the same audit (values may shift after other lanes' SEO work); if still
  clean, consider widening Step 1's URL list (e.g. /en/education/for-schools,
  /en/education/esl-word-games, /en/education/vocabulary-games-classroom) since those are
  the founder's growth-priority pages and haven't been individually word-counted yet.
