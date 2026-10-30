# AdSense Approval — Readiness Audit & Resubmission Runbook

Date: 2026-07-27 · Site: https://www.lexiclash.live · Publisher: `ca-pub-1896836706464880`

## UPDATE 2026-10-30: second "Low value content" pass

Audit method: every EN URL in the live sitemap.xml fetched with a Googlebot UA,
visible server-rendered text counted (Next streaming `hidden` blocks included,
nav/footer/scripts excluded), plus a mobile Playwright render of the key pages.

**What a reviewer finds now**

- Trust pages are fine: about (+ /about/ohad-fisher), contact, FAQ, how-to-play,
  rules, privacy, terms, disclaimer, editorial policy. ads.txt is correct,
  robots.txt allows Mediapartners-Google. Blog and guides are long and original.
- **The new risk is scale.** The word-list library added since the last review
  put **521 of 1,206 sitemap URLs (43%)** on four templates: 169 EN single-list
  pages (535–753 words, but two lists from the same grade share ~80% of their
  visible text), 30 grade hubs (median 198 words), 18 topic hubs (median 217),
  and the same again in he/es/sv/ja. That is the "scaled / templated pages"
  pattern AdSense and Google's helpful-content systems read as low value.
  None of these pages was in the top-20 Search Console pages over 90 days.
- Play surfaces stay thin on purpose (`/en/brain` 8 words, `/en/daily` 22,
  `/en/multiplayer` 39; see appShellSeoContent.test). That is fine **as long as
  no ad renders there** — AdSense only objects to ads on screens without content.

**Fixed in this PR**

- `lib/seo/wordLists/indexPolicy.ts`: single lists, grade hubs and topic hubs are
  now `noindex,follow` and out of sitemap.xml (they stay live and linked for
  teachers). The library hub and the per-language hubs stay indexed. One flag
  per tier to undo.
- `adSensePolicy.ts`: AdSense rejects a *site*, not the account, so the re-review
  runs on the same pub. The pub is no longer filtered out of env. Nothing ships
  unless env names it.
- `app/layout.tsx`: `<meta name="google-adsense-account">` renders only when
  `NEXT_PUBLIC_ADSENSE_CLIENT` (or `_ID`) is set. Meta only — no ad script.

**Ohad's steps (in order)**

1. Wait ~1–2 weeks after this deploy so Google recrawls the noindex pages and the
   smaller sitemap (resubmit sitemap.xml in Search Console to speed it up).
2. Railway → `lexiclash` service → Variables: `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-1896836706464880`
   → redeploy (build-time var). Check `view-source:https://www.lexiclash.live/en`
   shows the `google-adsense-account` meta.
3. AdSense → Privacy & messaging → European regulations → create and publish a
   GDPR message for lexiclash.live. The in-house cookie banner is **not** a
   Google-certified CMP, and EEA/UK/CH ad serving needs one.
4. AdSense → Sites → lexiclash.live → **Request review**. Keep Auto ads **off**
   (they follow client-side navigation into game screens).
5. After approval: reintroduce a consent-gated loader on content routes only
   (blog, guides, about-style pages; never the game, education or onboarding —
   `shouldLoadAdSense` already encodes those gates), then set
   `NEXT_PUBLIC_ADSENSE_ENABLED=true`.

---

## UPDATE 2026-07-27 (evening): "Low value content" root cause found & fixed

Google's rejection reason (confirmed by owner): **Low value content**.
Deeper reviewer-simulation audit (Playwright-rendered visible text, not raw SSR)
found the real causes:

1. **28 app-shell pages hid all publisher copy in `sr-only` blocks** — tools,
   daily, community, multiplayer, leaderboard, how-to-play, education, brain
   drills, rules, word-of-the-day, etc. Rendered visible text: `/en/tools` ≈347
   words, `/en/daily` ≈366, `/en/community` ≈451 — nearly all of it nav/UI.
   Human reviewers saw a game UI with zero readable content; hidden keyword
   text is also a negative spam signal. (Homepage was remediated the same way
   on 2026-06-04; the other 28 pages were missed.)
2. **Legal trust pages 404 at canonical URLs** — `/en/privacy`, `/en/terms`
   returned 404 (content only existed under `/en/legal/*`). Reviewers probe
   these canonical paths.
3. **Thin localized templates** — sv/ja/es homepages carry 2 FAQs vs 6 for
   en/he/ru; `/ja` homepage renders ≈188 words.

### Fixes shipped (same day)

- `components/seo/GamePageSeoContent.tsx` — now renders a **visible**
  neo-brutalist reference card (title, description, feature grid, native
  `<details>` FAQ, zero client JS, RTL-safe) by default; `srOnly` kept as an
  explicit escape hatch. This one flip gives ~25 app-shell pages 300–500 words
  of visible localized content.
- `app/[locale]/free-multiplayer-word-game/Showcase3DClient.tsx` — passes
  `srOnly` (block sits above a pinned 3D hero; page has its own visible FAQ).
- `app/[locale]/leaderboard/page.tsx` — removed a duplicate
  `GamePageSeoContent` (layout already renders it).
- `next.config.mjs` — 301s: `/[locale]/privacy`, `/privacy-policy`, `/terms`,
  `/terms-of-service`, `/cookies` → `/[locale]/legal/*`.
- Regression test `components/seo/__tests__/GamePageSeoContent.test.tsx`
  asserts visible-by-default rendering.

### Resubmission talking points

- Every game page now shows real, readable publisher content (rules, features,
  FAQs) — not just an app shell.
- Legal/trust pages resolve at canonical `/privacy` / `/terms` paths.
- Blog: 28 EN posts, median ~1,733 words, original editorial content.

### Remaining (non-blocking, next iteration)

- sv/ja/es homepages: expand FAQs natively (needs a translator, NOT
  auto-translate) to reach en/he/ru depth.
- If rejected again: request the specific sampled URLs via AdSense support and
  re-audit those exact pages.

---

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
