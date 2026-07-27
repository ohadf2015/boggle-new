# AdSense Approval — Readiness Audit & Resubmission Runbook

Date: 2026-07-27 · Site: https://www.lexiclash.live · Publisher: `ca-pub-1896836706464880`

## Verdict: READY TO RESUBMIT

All technical and content prerequisites verified live. The only remaining step is
re-submitting the site in the AdSense dashboard (requires Ohad's Google login).

## Audit results (verified live, 2026-07-27)

| Requirement | Status | Evidence |
|---|---|---|
| ads.txt at root | ✅ | `https://www.lexiclash.live/ads.txt` → `google.com, pub-1896836706464880, DIRECT, f08c47fec0942fa0` |
| Site-connection meta | ✅ | `<meta name="google-adsense-account" content="ca-pub-1896836706464880">` rendered unconditionally in `app/layout.tsx` (official method per support.google.com/adsense/answer/7584263) |
| Ad script integration | ✅ | `components/ads/AdSenseLoader.tsx` — consent-gated (Consent Mode v2), dark until `NEXT_PUBLIC_ADSENSE_ENABLED=true`; suppress on native/CrazyGames/child-tier/onboarding |
| Privacy policy | ✅ | `/en/legal/privacy` (~1065 words): names Google as third-party vendor, links `policies.google.com/technologies/partner-sites`, opt-out links (google.com/settings/ads, aboutads.info/choices), cookie disclosure |
| Terms / Disclaimer / Refund | ✅ | `/en/legal/terms`, `/en/legal/disclaimer`, `/en/legal/refund` — all 200 |
| Contact | ✅ | `/en/contact` — real email (lexiclash.game@gmail.com), Instagram, working form (`/api/contact`) |
| About / E-E-A-T | ✅ | `/en/about` + `/en/about/ohad-fisher`, editorial-policy, accessibility pages |
| Cookie consent (GDPR) | ✅ | Consent banner + Consent Mode v2 + "Manage Cookies" footer link (`utils/cookieConsent.ts`) |
| robots.txt | ✅ | Explicitly allows `Mediapartners-Google` and `Google-Display-Ads-Bot` |
| Content depth | ✅ | Homepage SSR ~1,038 words (EN) / ~969 (HE); blog with 21+ posts; 40+ informational landing pages (600–2,941 words each per nightly lane audit 2026-07-27 — no thin pages) |
| Navigation health | ✅ | All 38 internal footer/nav links on `/en` return 200; apex → www 301 chain clean |
| Indexing | ✅ | GSC URL Inspection PASS: `/en`, `/he`, `/en/about`, `/en/contact`, `/en/faq`, `/en/guides`, `/en/legal/terms`, `/en/legal/privacy`, `/en/rules`, top landing pages |
| Organic momentum | ✅ | GSC: 71,106 impressions / 926 clicks in last 28 days; sitemap 775 URLs, 0 errors |

## Known minor gaps (non-blocking)

- `/en/how-to-play`, `/en/glossary`, `/en/legal/disclaimer` — in sitemap, verdict NEUTRAL
  "URL is unknown to Google" (crawl lag, not an error). They'll index with continued crawl
  momentum. No action needed; do NOT remove them before review — they are live, linked, and
  substantive.
- Sitemap "indexed" count in legacy GSC API reports 0 — known API artifact; URL Inspection
  verdicts above are the source of truth.

## Resubmission steps (Ohad, ~10 min)

1. AdSense → Sites → Add site → `lexiclash.live` (bare domain; www/apex redirect is handled).
2. Verification method: pick **meta tag** — already deployed site-wide (no deploy needed).
   ads.txt also already matches the publisher ID.
3. Click **Verify** → then **Request review**.
4. Review takes a few days to 2–4 weeks. Status: AdSense homepage "Sites" card.
5. After approval:
   - Set `NEXT_PUBLIC_ADSENSE_ENABLED=true` in Railway env → redeploy.
   - Enable **Auto Ads** in AdSense (Ads → Overview → By site).
   - Ads stay consent-gated (EEA/UK) and suppressed in onboarding/child-tier automatically.

## If rejected again

- Read the exact reason in AdSense (Sites card → "Needs attention" → details). Common codes:
  - *Low value content* → the nightly 08-adsense lane keeps auditing; expand blog cadence.
  - *Site behavior: navigation* → re-run the link crawl (38/38 OK today).
  - *Valuable inventory: no content / under construction* → usually a crawl artifact on
    game routes; ensure reviewer entry points are `/en` + informational pages, not `/en/multiplayer`.
- Re-request review after fixing; there is no penalty for resubmission.

## References

- Connect your site to AdSense: https://support.google.com/adsense/answer/7584263
- Nightly lane history: `docs/nightly/artifacts/lane-08-adsense-*.md`
- Ad policy loader: `fe-next/lib/ads/adSensePolicy.ts`
