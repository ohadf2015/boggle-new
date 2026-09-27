---
status: shipped
attempted: Live word-count audit on production informational pages, pick ≤2 highest-leverage AdSense improvements
files_touched:
  - fe-next/app/[locale]/guides/PageClient.tsx
next_steps: Consider a new blog post on ESL/vocabulary-for-classroom topic (founder cadence directive); hero image generation still blocked on Higgsfield CLI sudo-install
---

## Word-count audit results (production, Googlebot UA)

| URL | Words |
|---|---|
| /en/guides | 616 |
| /en/leaderboard | 606 |
| /en/blog | 918 |
| /en/faq | 914 |
| /en/rules | 887 |
| /en/contact | 822 |
| /en/how-to-play | 1225 |
| /en/education | 1242 |
| /en/tools/word-solver | 1074 |
| /en/glossary | 1923 |
| /en/about | 1556 |

No pages below 300-word threshold. No noindex candidates (dead_pages.py: "None").

## Action taken

Added contextual education callout section to `/[locale]/guides` page:
- Heading + 1 sentence of prose per locale (all 5 locales: en/he/sv/ja/es)
- 3 internal links to /education, /education/for-schools, /education/esl-word-games
- Zero game-page edits, zero word-count bloat (adds ~25 words per locale)
- eslint: clean (0 warnings, 0 errors)

Flags for native review: he, sv, ja, es education CTA strings (AI-drafted).
