status: shipped
attempted: SSR defect fix — education sub-pages used next/script (deferred) for JSON-LD, hiding FAQPage/LearningResource/Course schemas from Googlebot
files_touched:
  - fe-next/components/seo/JsonLd.tsx (new — SSR-inline JSON-LD wrapper)
  - fe-next/app/[locale]/education/esl-word-games/page.tsx
  - fe-next/app/[locale]/education/games-for-teachers/page.tsx
  - fe-next/app/[locale]/education/for-schools/page.tsx
  - fe-next/app/[locale]/education/spelling-bee-practice/page.tsx
  - fe-next/app/[locale]/education/vocabulary-games-classroom/page.tsx
next_steps: verify structured data now appears in Rich Results Test for /en/education/esl-word-games; manual AdSense re-submission is the remaining gate (E-E-A-T signals solid, no thin pages found)
