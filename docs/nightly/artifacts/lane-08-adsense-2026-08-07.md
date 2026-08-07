status: shipped
attempted: run live word-count audit + GSC dead-page check, pick <=2 highest-leverage informational-page fixes (thinness/SSR defect or ≤200w prose or internal linking or JSON-LD), no game pages, no bloat

## Result

- Live word-count audit (Googlebot UA, production): /en 1033, /ja 246 (CJK tokenizer artifact — not real thinness), /sv 734, /es 901, /he 970, /en/about 1579, /en/contact 848, /en/blog 1011, /en/faq 933, /en/how-to-play 1244, /en/rules 913, /en/glossary 1934, /en/guides 682, /en/leaderboard 307, /en/legal/privacy 1065, /en/legal/terms 1225, /en/education 1308, /en/tools/word-solver 1095.
  - No genuinely thin informational page found (all >300w except /ja CJK artifact). No SSR/thinness defect surfaced tonight.
- GSC dead-page check (`python3 scripts/nightly/tools/dead_pages.py`): flagged /en/words/starting-with/{i,o,y,f} — all 4 already in `DEAD_LETTERS` noindex set from a prior night (`app/[locale]/words/starting-with/[letter]/page.tsx`). No new dead letters to add — no-op on this front, cap not needed.
- Action taken: internal-linking gap. Grepped for links into `/education` from strong informational pages (about/faq/how-to-play/guides/glossary) — only 3 blog posts linked there; About/FAQ/Guides/Glossary sent zero link equity to the Education growth priority (#3 founder priority). Added 2 contextual links from `/[locale]/about` (zero new prose beyond one 4-word CTA label):
  1. "Education Integration" feature card (`whatMakesUsDifferent.education`) → now links to `/[locale]/education` (hub).
  2. "For Educators" section → added CTA link "Explore programs for schools →" to `/[locale]/education/for-schools`.
- Files edited:
  - `fe-next/app/[locale]/about/PageClient.tsx` (FeatureCard gained optional `href` prop; wired education card + added CTA link in For Educators section)
  - `fe-next/app/[locale]/about/content.ts` (added `forEducators.ctaLabel` field, English text)
- Locale note: `about/content.ts` only ever defined an `en` content object (`contentByLocale[locale] || contentByLocale.en` — pre-existing debt, About page body renders English text for all 5 locales already, same pattern as the documented `words/starting-with` English-only precedent). The new CTA label follows that existing precedent — no new locale-parity regression introduced (nothing to translate into he/sv/ja/es since the whole component was already English-only pre-edit). Flagging for native review is N/A — it's the same debt as before, not new AI-drafted prose in a translated surface.
- Noindexed (zero-traffic dead pages): none new — the 4 GSC-flagged letters were already noindexed.
- Locales needing native review: none (no new translated prose).
- AdSense readiness note: no thinness/SSR defects found this pass; site's word counts on core informational pages are healthy. Real remaining blocker is unchanged: operator re-submit decision after informational-page quality/linking has had time to be recrawled. Next-run idea: extend the same education-hub internal-linking pass to /en/faq, /en/how-to-play, /en/guides, /en/glossary (same pattern, still zero new prose).
