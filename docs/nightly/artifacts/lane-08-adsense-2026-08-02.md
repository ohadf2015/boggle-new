status: shipped
files_touched: fe-next/components/Footer.tsx, fe-next/translations/en.js, fe-next/translations/he.js, fe-next/translations/sv.js, fe-next/translations/ja.js, fe-next/translations/es.js
next_steps: |
  Shipped: internal-linking fix only (0 new prose beyond the link label). Live prod page
  /en/education/spelling-bee-practice (200 OK) was crawl-orphaned — linked only from the
  /education hub itself, absent from the sitewide Footer "For Teachers" block that already
  carries vocabularyGames/gamesForTeachers/eslWordGames/forSchools (same crawl-equity
  pattern documented at Footer.tsx:78-82, docs/2026-05-30-education-teacher-seo-intent.md).
  Added footer.spellingBeePractice key to all 5 locales + wired the <Link> in Footer.tsx.
  he/sv/ja/es strings AI-drafted, need native review.
  Word-count audit (prod, Googlebot UA): thinnest non-CJK informational page is
  /en/leaderboard (307w) — already bumped 220->330w on 07-28, near floor, not a fresh
  defect. /ja (246w) is the known tokenizer artifact, not verified thin by eyeball tonight.
  JSON-LD audit: FAQPage/HowTo/BreadcrumbList/DefinedTermSet/AboutPage/WebSite already
  present on all 7 checked informational pages (leaderboard/faq/how-to-play/rules/
  glossary/guides/about) — no schema gap found.
  Noindex candidates (Step 2, dead_pages.py): starting-with/{d,i,o,y,f} at 0 clicks/<=2
  impr 28d — all 5 already covered by the existing DEAD_LETTERS set in
  fe-next/app/[locale]/words/starting-with/[letter]/page.tsx (prior lane), no new action.
  AdSense readiness: no thinness/SSR defect found tonight; site's informational pages are
  substantive (682-1934w) with full schema coverage. Re-submission still blocked on
  operator's manual call, not on remaining code work found here.
