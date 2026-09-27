# AdSense Approval Plan — LexiClash (lexiclash.live)

**Date:** 2026-06-04
**Status:** Diagnosis complete (ground-truthed against live Google dashboards). Implementation in progress.
**AdSense publisher:** pub-1896836706464880 · ads.txt: Authorised ✓

---

## TL;DR

We are **not** failing because we lack policy pages or a blog — we have both, and the blog content is genuinely good (first-person, expert voice). We are failing because **the indexed surface that Google evaluates is dominated by thin, programmatic pages, and the domain's entry point (the homepage) is an interactive game with zero visible prose.** AdSense reviews the *whole domain*; the reviewer lands on a game, and the crawler's index is ~71% thin URLs. That reads as "thin game + programmatic-SEO machine," not "publisher."

**The fix is subtractive first, additive second:** shrink the thin indexed surface, make publisher content visible on the pages a reviewer actually hits, then reapply from a content URL after Google re-crawls.

---

## Verified diagnosis (evidence, not theory)

All numbers pulled live on 2026-06-04 from the user's authenticated Google sessions via Playwriter.

### AdSense (source of truth)
- Site `lexiclash.live` → **Needs attention → "Low value content."** Submitted at the **domain root** (not a content URL). Last rejection: 4 Jun 2026 02:10 IDT.
- **No manual action** in Search Console ("No issues detected") → this is the *algorithmic* low-value gate, not a penalty. Remediation = improve quality signals, not a reconsideration request.

### Search Console — Page indexing (last update 29/05/2026)
- **Indexed: 1,190 pages.** **Not indexed: 1,750.**
- Not-indexed reasons: Excluded by `noindex` **1,050** · Alternative page w/ canonical **274** · **Soft 404 — 135** · **Crawled, currently not indexed — 258** · Duplicate, Google chose different canonical **15** · 404 **7** · Page with redirect **9**.
- The site has organic impressions (Performance chart non-zero) → domain is not brand-new; **domain age / no-traffic is not the gate.**

> **Branch decision (was the open question):** the site is **over-indexed with thin pages**, not under-indexed. 1,190 pages are indexed and Google is *already* quality-rejecting 258 ("crawled, not indexed" = not good enough to index) and flagging 135 as soft-404 (rendered to a near-empty DOM). Culling thin pages is therefore the correct and safe lever — it cannot "hide content Google can't see," because Google sees and indexes plenty.

### Live sitemap (`https://www.lexiclash.live/sitemap.xml`, fetched 2026-06-04)
- **1,555 total URLs** (the `~410` comment in `sitemap.ts` is stale).
- **Thin: ~1,106 (71%)** — `/daily/archive/{date}` **780** (156 dates × 5 locales) + `/anagram/*` **240** + `/word-of-the-day/{date}` **86**.
- Substantive: `/blog/*` **130** + `/guides/*` **15** + comparison/landing/legal/about ≈ ~100–250.

### Codebase facts (verified by reading source)
- `app/[locale]/daily/archive/[date]/page.tsx:102` sets `robots: { index: true, follow: true }` for **all 5 locales** → 780 thin archive pages explicitly invited to index.
- `components/seo/GamePageSeoContent.tsx` renders a **`sr-only`** (visually hidden) block of title + description + features + FAQ, mounted on the **homepage** (`app/[locale]/page.tsx:247`) and on `contact`, `tools`, `tools/word-solver`, `word-of-the-day`. *Note: this is hidden-text-for-crawlers; it is NOT cloaking (same HTML is served to all user-agents), but it means the homepage's only indexable prose is invisible to the human reviewer.*
- Homepage `app/[locale]/page.tsx` renders `<HomePageClient/>` (game-mode grid) + the sr-only block. **No visible long-form prose, no blog feed.**
- Blog posts are server components; content lives in `app/[locale]/blog/{slug}/content.ts` and renders in the initial HTML. Sample (`boggle-vs-wordle`) is **genuine first-person expert writing** — *not* AI slop. → **No mass blog rewrite needed.**
- noindex idiom already in use: `robots: { index: locale === 'en', follow: true }`.

---

## Root causes, ranked

| # | Root cause | Confidence | Why it drives "low value" |
|---|---|---|---|
| 1 | **Thin programmatic pages dominate the index** (780 archive + 240 anagram + 86 WOTD ≈ 71% of sitemap; 258 already "crawled, not indexed"; 135 soft-404) | **Very high** | Domain-level quality average is dragged below threshold; site reads as a programmatic-SEO machine. |
| 2 | **Reviewer entry point is a game with no visible content** (domain submitted at root; homepage = game grid + only *hidden* prose) | **Very high** | The human reviewer's first impression is "thin interactive tool," not "publisher." |
| 3 | **Soft-404 / empty-DOM pages** (135) — likely thin game-mode or JS-shell routes Google renders as empty | High | Direct "no content" signal; same signal the AdSense reviewer inherits. |
| 4 | **Homepage's only prose is `sr-only`** | Medium | Hidden-text pattern wastes the most-reviewed page; convert to visible to both fix UX-reviewer impression and keep SEO value. |
| 5 | AI-templated / 5×-locale-duplicated feel on *some* posts | Low–medium | Flagship posts are strong; risk is in thinner locale variants & template clusters. Not the primary driver. |
| 6 | Domain age / traffic | Ruled out | Organic impressions present; domain has history. |

---

## The plan (subtract → make visible → reapply)

### Phase 1 — Shrink the thin indexed surface  *(highest leverage, low risk)*
1. **Noindex the 780 daily-archive date pages.** `daily/archive/[date]/page.tsx`: `robots: { index: false, follow: true }`. Pages stay fully playable; they leave the index. (`follow: true` preserves link equity to real pages.)
2. **Trim the sitemap** (`app/sitemap.ts`): drop the per-date archive loop, drop dated word-of-the-day entries, drop programmatic anagram per-letter pages. Keep hubs (`/daily/archive`, `/anagram`, `/word-of-the-day`) and all substantive content. Target sitemap ≈ 150–300 high-value URLs.
3. **Noindex thin programmatic clusters** that remain (per-letter anagram pages, n-letter word lists) — keep a curated hub page with real prose instead.
4. Fix the stale `~410` comment in `sitemap.ts`.

### Phase 2 — Make the reviewer's entry point look like a publisher
5. **Convert the homepage `GamePageSeoContent` from `sr-only` to a visible section** below the game: a real "How to play / About LexiClash / FAQ" block with H2s and 600–900 words of visible, useful prose. (Preserve the text — don't delete — so SEO value is retained and the reviewer now *sees* substance.)
6. **Add a visible "From the blog / Guides" module** to the homepage linking the 3–6 best articles, so the homepage proves an active publication.
7. Ensure header/footer prominently links Blog, Guides, About (author), Editorial Policy from every page.

### Phase 3 — Kill the soft-404s
8. Inspect the 135 soft-404 URLs in GSC (URL Inspection), identify the route patterns (likely thin game-mode or empty JS-shell routes), and either add real server-rendered content or `noindex` them.

### Phase 4 — Reapply protocol *(do NOT reapply early)*
9. Deploy Phases 1–2. In GSC: **Sitemaps** → resubmit trimmed sitemap; optionally **Removals** for fastest archive de-indexing.
10. **Wait until the GSC indexed count visibly drops** (re-crawl of 780 noindex'd pages takes ~1–3 weeks) before reapplying — reapplying with an unchanged index reads as "no change."
11. Reapply. AdSense submits the domain, but ensure the homepage now carries visible content; the reviewer will land on a content-bearing page.

### Phase 4 — Do NOT do
- ❌ Publish 20 more SEO posts (volume isn't the gap).
- ❌ Add more programmatic anagram/word pages.
- ❌ Mass-rewrite the blog (content quality is already good).
- ❌ Reapply weekly with no index change.

---

## Implementation log

(Updated as phases land.)

- [x] **Phase 1.1 — noindex the 780 daily-archive date pages.** `app/[locale]/daily/archive/[date]/page.tsx`: `robots: { index: true }` → `{ index: false, follow: true }`. Pages stay playable. TDD: `app/[locale]/daily/archive/[date]/page.test.tsx` (noindex on all 5 locales + self-canonical retained).
- [x] **Phase 1.2 — trim sitemap.** `app/sitemap.ts`: removed the per-date archive loop (≈780 URLs). Kept the `/daily/archive` hub and the curated Word-of-the-Day per-date pages (genuine dictionary-style content). TDD: extended `app/sitemap.test.ts` (0 per-date archive URLs, hub present, WOTD kept). Net sitemap: ~1,555 → ~775 URLs (−50%).
- [x] **Phase 2.5 — visible homepage content section.** New `components/seo/HomepageContentSection.tsx` (server component, neo-brutalist, native `<details>` FAQ — zero client JS) renders the same 5-language About/Features/FAQ copy **visibly** + editorial links (how-to-play, guides, blog, about). Replaced the `sr-only` `GamePageSeoContent` on the homepage (`app/[locale]/page.tsx`). TDD: `components/seo/HomepageContentSection.test.tsx` (visible-not-sr-only, all features/FAQ, locale-prefixed links).
- [x] **DEPLOYED to production** — `ffe29982f`, Railway GitHub auto-deploy (push-to-master = deploy), build SUCCESS. Verified live: homepage serves visible content; archive returns `noindex,follow`; live sitemap `/daily/archive/20*` = 0.
- [x] **Phase 4a — resubmitted the trimmed sitemap in GSC** (2026-06-04). GSC immediately re-read it: **Discovered pages 1,463 → 775** (the ~780-URL archive drop registered). Re-crawl of the noindex'd pages now in motion.
- [x] **Phase 3 — soft-404 root cause found (GSC drill-down).** All 135 "Soft 404" + most of the 258 "Crawled, currently not indexed" are `/[locale]/words/{word}` single-word pages (`dais`, `om`, `erg`, `caribou`, `morn`…). **FINDING: that route is ALREADY `robots:{index:false,follow:true}` (`app/[locale]/words/[word]/page.tsx:117`)** — so it does NOT drag *indexed* quality. The soft-404/crawled-not-indexed counts are wasted crawl budget: Google follows internal links (from `/words/[n]-letter-words`, `/words/starting-with/[letter]`, `/anagram/[letters]`) to a ~2M-URL dynamic space, renders thin/obscure-word pages, and (correctly) doesn't index them. Decision: **NOT fixing now** — it's noindex already (no indexed-quality impact) and touching the internal links risks the UX/SEO of the *indexed* word-list pages. Lower-priority options if revisited: (a) `notFound()` for confirmed-invalid words (fail-open on API error), or (c) enrich valid-word pages with real definitions.
- [ ] Phase 1.3 — (deferred, low priority) EN-only anagram per-letter pages (already EN-only-gated).
- [ ] Phase 2.6 — (optional) dynamic "latest blog posts" feed (static editorial links already shipped in 2.5).
- [ ] Phase 3b — (optional) non-EN `/education/*` variants showed in crawled-not-indexed; verify they're locale-gated noindex.

### Status after this session
Both dominant levers are **implemented, tested, deployed, and live**: (1) the thin indexed surface is culled (780 archive pages noindex'd + dropped from the sitemap, 1,555→775), and (2) the homepage now shows visible publisher content instead of `sr-only`. The sitemap is resubmitted and GSC already reflects the smaller surface (775). The remaining thin pages (`/words/{word}`) are already noindex and are a crawl-budget cosmetic, not an indexed-quality problem.

### Reapply checklist (owner — when ready, ~1–3 weeks out)
1. In GSC → **Pages**, watch the **Indexed** count fall (currently ~1,190) as Google re-crawls the 780 noindex'd archive pages. Optional accelerator: GSC → **Removals** → temporary-hide prefix `…/daily/archive/`.
2. When the indexed count has visibly dropped (and ideally the "Crawled, not indexed"/"Soft 404" buckets shrink), **reapply for AdSense** (Sites → the lexiclash.live entry → "Request review").
3. Do **not** reapply with an unchanged index — an unchanged surface reads as "no change" and re-rejects.
