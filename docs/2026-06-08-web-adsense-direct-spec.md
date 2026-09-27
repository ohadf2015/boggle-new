# Direct Web AdSense (replacing PurpleAds) — Spec

**Date:** 2026-06-08
**Status:** Built, UNCOMMITTED, ships DARK (`NEXT_PUBLIC_ADSENSE_ENABLED` off by default).

## Why
Live audit (Playwriter, www.lexiclash.live) found the web app serves **zero display ads**:
no `adsbygoogle`, no `googlesyndication`/`purpleads` script in the DOM, `window.adsbygoogle`
undefined — even after granting advertising consent. `gtag` loads fine, so it's not a blanket
blocker. Conclusion: the PurpleAds managed layer (which was meant to inject AdSense externally
via GTM) **is not loading** → web ad revenue ≈ 0. Per the user: **"purpleads can be removed."**

So: drop the absent/managed PurpleAds dependency and **own a direct Google AdSense integration
in-repo** under our existing DIRECT publisher id (`google.com, pub-1896836706464880, DIRECT`).

## What shipped (UNCOMMITTED), TDD
- `lib/ads/adSensePolicy.ts` (pure, 8 tests): `getAdSenseClient()` (default `ca-pub-1896836706464880`,
  env-overridable), `isAdSenseConfigured()` (dark unless `NEXT_PUBLIC_ADSENSE_ENABLED==='true'`),
  `shouldLoadAdSense({enabled, hasAdConsent, isNative, isCrazyGames, suppressedByTier})`.
- `components/ads/AdSenseLoader.tsx`: injects official `adsbygoogle.js?client=…` (Auto-Ads) via
  next/script. Renders nothing unless enabled + advertising consent (Consent Mode v2, reactive via
  `onConsentChange`) + web (not native/CrazyGames) + not child tier. **Closes the web child-ad gap**
  the audit flagged (web previously had no tier suppression).
- Mounted once in `app/[locale]/layout.tsx` (next to GoogleAnalytics).
- `public/ads.txt`: PurpleAds block + ~45 reseller lines removed; direct Google line kept.
- CSP already allows `pagead2.googlesyndication.com` (script/frame/connect-src) — no change needed.

## Go-live checklist (owner)
1. **Remove the PurpleAds tag from GTM** (external — GTM container, or via Playwriter on tagmanager).
   Until then, leaving AdSense dark avoids double-serving.
2. **Enable Auto-Ads** in the AdSense dashboard for the site (Auto-Ads auto-places units; the script
   alone does nothing without it). Optionally add manual `<ins class="adsbygoogle" data-ad-slot>`
   units later for specific high-value placements (homepage mid-content, SEO pages, leaderboard).
3. Set env (prod): `NEXT_PUBLIC_ADSENSE_ENABLED=true` (and `NEXT_PUBLIC_ADSENSE_CLIENT` if not the
   default pub id).
4. Verify: with advertising consent granted, the homepage loads `adsbygoogle.js` and Auto-Ads
   render; declined consent → no script (correct).

## Caveats
- **Auto-Ads on/off is a dashboard setting** — code is the necessary in-repo half only.
- GTM PurpleAds tag removal is external (not in repo).
- Manual placement units (`<ins>` with slot ids) are a follow-up; Auto-Ads needs no slot ids.
- Account must be approved for direct AdSense serving (the DIRECT ads.txt line indicates it is).
