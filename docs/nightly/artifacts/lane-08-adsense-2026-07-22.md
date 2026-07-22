status: shipped
attempted: word-count audit of informational pages + noindex dead thin pages if GSC confirms zero traffic + ItemList JSON-LD on guides hub
files_touched:
  - fe-next/app/[locale]/guides/page.tsx
next_steps: |
  - dead_pages.py confirmed 5 dead letters (f,i,w,d,o) — already noindexed via DEAD_LETTERS (prior run)
  - guides hub now has ItemList schema (BreadcrumbList + FAQPage + ItemList)
  - next: check blog posts for internal links to sub-guide pages (currently only hub linked, not /classic-strategy etc.)
  - next: consider adding CollectionPage type if GSC shows guides hub still under-indexed
