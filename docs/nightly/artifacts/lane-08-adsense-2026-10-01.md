status: shipped
attempted: word-count audit prod + GSC dead-page check + pick <=2 high-leverage informational-page fixes
files_touched: fe-next/app/[locale]/about/PageClient.tsx
next_steps: |
  - Word-count audit clean: all informational pages >=400 words except /ja (CJK tokenizer artifact, not real thinness).
  - JSON-LD already present (Breadcrumb/FAQ/schema) on glossary, guides, faq, how-to-play, rules, word-solver, leaderboard — no gap.
  - GSC dead_pages.py timed out (rc124, inconclusive) — skipped noindex per spec (never blind-noindex).
  - Internal-link audit: /rules, /how-to-play, /glossary, /guides, /faq, /word-solver already covered by GlobalBottomNav + Footer. /leaderboard had ZERO inbound links from other pages — real gap.
  - Shipped: wrapped the existing "competitive leaderboards" phrase in About page's "What We Do" section as a Link to /[locale]/leaderboard. Zero new prose, safe split-based render with fallback to plain text if content string ever changes.
  - Tomorrow: re-run dead_pages.py earlier in the run (before GSC quota/latency issues) to get real zero-traffic noindex candidates; consider adding a similar single inbound link to /leaderboard from /education or /blog if traffic data supports it.
