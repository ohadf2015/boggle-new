status: shipped
attempted: word-count audit + GSC dead-page check + complete author publication record
files_touched:
  - fe-next/app/[locale]/about/ohad-fisher/page.tsx
next_steps: >
  Add "By Ohad Fisher" link in article header meta section across all 26 blog
  post PageClients (currently only date + read time; author bio is at foot only).
  Consider batching this as a shared BlogPostByline component update.
  Dead-page noindex (c/f/i/y) already shipped in prior run — watch for GSC
  re-crawl confirmation before adding more letters.
