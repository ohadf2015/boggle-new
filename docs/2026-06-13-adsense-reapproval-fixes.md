# AdSense re-approval — gap audit + fixes (2026-06-13)

Prior rejection reason: **"low value content."** Audited live prod (`www.lexiclash.live`)
+ repo + Gemini council. Most expected gaps were **already remediated in prod** — the
real remaining gaps were narrower than the rejection implies.

## What we found (live prod, not just repo)

| Area | Live status | Verdict |
|---|---|---|
| Legal pages (Privacy/Terms/Cookies/Disclaimer) | Live, real prose | ✅ fine |
| Editorial: 25+ blog articles, guides, rules, FAQ, glossary, education hubs | Live, server-rendered, genuine first-person prose w/ citations | ✅ fine |
| E-E-A-T: `AuthorBioCard` (photo, bio, `/about/ohad-fisher`, `/editorial-policy`, email) | Live, both routes 200 | ✅ fine |
| Homepage editorial About/FAQ section | Visible in server HTML (curl-confirmed) | ✅ fine |
| WOTD per-date pages (the repo showed `index:true`) | Prod serves `<meta robots="noindex,nofollow">` | ✅ already fixed in prod |
| Sitemap | 538 URLs (already trimmed from 1000+) | ✅ fine |
| robots.txt | Allows `Mediapartners-Google` (AdSense crawler) | ✅ fine |
| ads.txt | `google.com, pub-1896836706464880, DIRECT` live | ✅ fine |
| **AdSense ownership verification** | **No `google-adsense-account` meta; serving script dark + consent-gated → review crawler never sees `ca-pub`** | ❌ FIXED here |
| **Publisher-first landing signal** | Editorial links only in footer + below the game canvas; persistent top nav = game UI only | ❌ FIXED here |

## Changes shipped (this branch)

1. **AdSense account-verification meta tag** — `lib/ads/adSensePolicy.ts:getAdSenseAccountMeta()`
   + `app/layout.tsx` `metadata.other['google-adsense-account']`. Renders
   **unconditionally** (privacy-neutral: no script, no cookie). Lets Google verify the
   domain ↔ publisher account even while ad *serving* stays consent-gated/dark — the
   review crawler never grants cookie consent, so it never triggers the consent-gated
   `adsbygoogle.js` and previously had no way to connect the site to the account.
2. **Top-of-DOM editorial nav** — `components/seo/HomeEditorialNav.tsx`, rendered as the
   first element in `app/[locale]/page.tsx`. Server-rendered, locale-keyed (5 langs),
   no client JS. Surfaces How-to-Play / Guides / Blog / FAQ / About in the crawler's
   first paint so the landing reads as a *content publisher*, not just a game.

TDD: `lib/ads/__tests__/adSensePolicy.test.ts` (+2 cases), `components/seo/__tests__/HomeEditorialNav.test.tsx` (4 cases). lint0 / tsc0.

## Remaining MANUAL steps (sensitive — left for the owner to decide)

These touch live monetization / EU privacy posture, so they were **not** flipped
autonomously:

1. **Enable ad serving for the re-review window.** Set `NEXT_PUBLIC_ADSENSE_ENABLED=true`
   on Railway prod. The account is unapproved, so the script serves **no ads** to real
   users yet — it only makes `adsbygoogle.js` present so Google can complete the review.
2. **Consent Mode v2 "advanced" (optional, recommended for serving).** Today the script
   is *fully* withheld until advertising consent (`AdSenseLoader` requires `hasAdConsent`).
   That's GDPR-strict but means the review crawler (no consent) never loads the script.
   Google's sanctioned pattern: load `adsbygoogle.js` always (when enabled), set Consent
   Mode defaults to `denied`, and let Consent Mode govern *serving*. The verification
   meta tag (#1 above) already unblocks ownership verification without this change; do
   this only if a full serving review is needed.
3. **Check Google Search Console** for any manual action / coverage messages — primary-
   source signal about what Google actually flagged. (We have the `seo-daily` skill + GSC
   access.)

## Honest expectation

These raise approval odds; they do not guarantee approval. A game-first domain can be
hard to approve on content grounds regardless. "Low value content" is also Google's
opaque catch-all — the most likely lever here was the verification gap (crawler couldn't
connect the account) + the game-first first impression, both now addressed.
