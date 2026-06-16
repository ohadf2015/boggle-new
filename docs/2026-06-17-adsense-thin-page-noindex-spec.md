# AdSense "low value content" — thin-page noindex sweep (2026-06-17)

## Goal
Lift AdSense approval odds. Prior rejection reason: **"low value content."** Research
(Reddit r/Adsense, incl. the "what you should know before applying" + "approval isn't
random" + Next.js tool-site threads) + an audit of our own indexable surface.

## Research → which findings are already handled

Cross-source AdSense approval checklist vs. our live prod (`www.lexiclash.live`):

| Reddit lesson | Our state | Verdict |
|---|---|---|
| Essential pages (About/Contact/Privacy/Cookies/Terms) exist + easy to find | All live, real prose, linked in footer + top editorial nav | ✅ done |
| Content must read human / not AI-slop (top Reddit comment: *"is this another chatgpt article?"*) | Blog is expert first-person prose w/ cited studies (fMRI, Hagoort MUC, Lumosity FTC fine) | ✅ not slop |
| Pages indexed before applying | GSC: ranking pos 6–9 on ~40 keywords, 2200+ impr/28d → indexed | ✅ done |
| Clean code + schema | Rich JSON-LD already live: Organization, WebSite+SearchAction, FAQPage, HowTo, BreadcrumbList, ContactPoint, VideoGame | ✅ done |
| AdSense crawler can connect account | `google-adsense-account` meta + ads.txt DIRECT + `Mediapartners-Google` allowed | ✅ done (2026-06-13) |
| Single niche | Word games | ✅ |
| CMP / consent | Consent Mode v2 + banner | ✅ |
| **No thin / empty indexable pages** (Reddit C5/C6: *"removed thin category pages → AdSense thought my site was high quality"*) | **GAP — see below** | ❌ FIX HERE |

## The one verified, on-point gap

A cluster of **zero-prose, interactive-only pages still serving `index, follow`** in
prod (verified by curl, not just repo). They have JSON-LD + a React client but ~200–300
words of visible prose — exactly the "low value content" sample that drags the domain's
content-quality average below AdSense's bar.

| Route family | Count | Prod robots | Visible prose | Action |
|---|---|---|---|---|
| `/[locale]/practice` (hub) | 5 | `index, follow` | mode cards + CTA only | **noindex** |
| `/[locale]/practice/[mode]` (classic, wordHunt, wheelRush) | 15 | `index, follow` | mode description + UI only | **noindex** |
| `/[locale]/education/access` (form/redeem page) | 5 | `index, follow` | form labels only | **noindex** |

Why subtractive (noindex) not additive (pad with prose): these are interactive
utilities. Padding them with SEO prose × 5 locales is the "made-for-ads" anti-pattern and
real filler-risk. Reddit's proven lever is to *remove thin pages from the crawl sample*
so what AdSense samples is only our rich pages (blog, FAQ, rules, words, leaderboard,
brain, tools, education main, comparison-EN — all confirmed RICH). Re-index post-approval
if we later invest in real practice-page content.

## NOT in scope (deliberate)
- WOTD `/[locale]/word-of-the-day/[date]` — repo reads `index:true` but **prod already
  serves `noindex`** for archive dates (runtime override; verified by curl). Leave it.
- `lexiclash-vs-wordwall-kahoot-quizlet` non-EN (`index:true` all locales, EN-only body =
  near-dup) — real but secondary; switching to `index: isEnglish` needs matching
  `enOnlyAlternates` handling (else "alternate page with noindex" in GSC). Follow-up.
- `/brain/drills/*` non-EN thin FAQ — has substantive description + feature lists; not
  zero-prose. Over-noindexing real content is worse. Leave.
- JSON-LD / structured data — already comprehensive (see table). No work.

## Implementation (TDD)
`generatePageMetadata` already supports `noIndex?: boolean` (lib/seo/generatePageMetadata.ts:17)
emitting `robots: { index:false, follow:false }`.

1. `app/[locale]/practice/page.tsx` — add `noIndex: true` to the `generatePageMetadata` call.
2. `app/[locale]/practice/[mode]/page.tsx` — add `noIndex: true` to both `generatePageMetadata`
   calls (valid-mode + invalid-mode fallback).
3. `app/[locale]/education/access/page.tsx` — add `robots: { index: false, follow: false }`
   to the returned `Metadata` (custom builder, doesn't use the helper).

Tests (RED first): assert each page's `generateMetadata` resolves `robots.index === false`.

## Verification (honest scope)
Cannot verify "AdSense approves" — that's Google's opaque call. Done =
- new tests RED→GREEN; `npm run test` (changed) green
- `npm run lint` + `tsc` clean; build green
- the three families resolve `noindex` in metadata
- rich pages remain `index, follow` (no over-noindexing)

Raises approval odds; does not guarantee. "Low value content" is Google's catch-all; the
most defensible lever left after 2026-06-13's verification fix is shrinking the thin-page
crawl sample.
