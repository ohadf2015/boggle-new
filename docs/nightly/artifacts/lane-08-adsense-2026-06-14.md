---
status: shipped
files_touched:
  - fe-next/app/[locale]/guides/page.tsx
next_steps: |
  Operator: re-submit to AdSense — schema propagation from 06-11 is ~7d old, E-E-A-T is solid.
  Code: no open items. Dead pages (c/f/i/y) already noindexed via DEAD_LETTERS.
  If rejected again: check GSC Coverage → Indexed to confirm blog posts crawled.
---

## Audit summary

### Word-count audit (prod, Googlebot UA)
| URL | Words | Status |
|-----|-------|--------|
| /en/guides | 616 | thin-ish hub, real content |
| /en/leaderboard | 606 | earns traffic (pos 3.2) |
| /en/contact | 822 | OK |
| /en/blog | 918 | OK |
| /en/faq | 908 | OK |
| /en/education | 1235 | OK |
| /en/about | 1556 | OK |
| /en/glossary | 1917 | OK |
| /en/guides/classic-strategy | 2036 | OK |
| /en/guides/blast-strategy | 2363 | OK |
| /en/guides/word-hunt-strategy | 2029 | OK |
| /en/about/ohad-fisher | 678 | OK (author profile) |
| /en/editorial-policy | 695 | OK |

### Dead-page check (GSC 28d)
- /en/words/starting-with/c — 0 clicks, 2 impr — already noindexed (DEAD_LETTERS set)
- /en/words/starting-with/f — 0 clicks, 2 impr — already noindexed

### Action taken
fe-next/app/[locale]/guides/page.tsx: force-dynamic → revalidate = 86400
All content is module-level static constants; force-dynamic was preventing CDN caching.

### E-E-A-T status
- Author image: 200 OK
- Author profile: 200 OK (678w, transparent bio)
- Editorial policy: 200 OK (695w)
- Blog JSON-LD: Person schema wired in BlogPostingJsonLd
- Visual bylines: confirmed in SSR HTML

### Readiness
Schema propagation from 06-11 batch is now past the 7d window.
Re-submission to AdSense is the operator next action.
