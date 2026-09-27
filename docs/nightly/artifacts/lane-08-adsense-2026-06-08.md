status: shipped
attempted: Fix SSR-invisible JSON-LD schemas on /en/best-online-word-games (FAQPage + VideoGame using next/script afterInteractive = never seen by Googlebot)
files_touched:
  - fe-next/app/[locale]/best-online-word-games/page.tsx
next_steps: |
  - Article + ItemList schemas on that page still client-side only (next/script).
    Create components/seo/ArticleJsonLd.tsx + ItemListJsonLd.tsx wrappers, then swap.
  - Monitor GSC Rich Results for FAQPage on /en/best-online-word-games (~7d post-deploy).
  - /en/leaderboard ranks 3.3 for "best competitive word games with global leaderboards" —
    no query-specific JSON-LD; add FAQPage schema (3 Q&As).
  - GSC scope (webmasters.readonly) still missing — blocks noindex decisions.
