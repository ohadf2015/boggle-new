# Families Policy — Ads & target-audience reconciliation (2026-06-04)

Follow-up to `docs/2026-06-03-families-policy-social-compliance.md`. That pass fixed
the **social** half ("Social Apps & Features" — chat/DM/friend age-gating, commits
`69ae2d905` + `2fdedf2c9`, in Play review as versionCode **5713**). This pass closes
the **ads** half and surfaces the one thing that actually decides re-review: the
target-audience declaration.

## TL;DR

- **Code shipped this pass:** suppress all ads for users we have *actual knowledge*
  are under 13 (`tier === 'child'`). Adults + unknown-age keep normal ads.
- **The real lever is non-code:** the Play Console **Target Audience & Content**
  declaration must match in-app behaviour, and the **Child Safety Standards (CSAE)**
  form must be published. Owner actions — see below.
- **No native release needed.** App is a remote-URL Capacitor shell; AdMob is driven
  from JS served off `lexiclash.live`, so this reaches the in-review binary web-side.

## The contradiction this pass exposed

Three sources disagree about who the app is for:

| Source | Says |
|---|---|
| `CLAUDE.md` (root) + families-policy doc | "ages 15-40", "we do NOT build for kids" |
| `docs/google-play-store-listing.md` (questionnaire notes) | **"Target age: 10+ (everyone, parental guidance suggested)"** |
| The **code** | *mixed-audience pattern*: admits under-13, restricts their social surfaces, lets them keep playing |

A "10+ / everyone" declaration **includes children**, which is what the code already
implements. Re-review bounces when in-app behaviour and the declaration disagree — so
this contradiction, not a missing ad SDK flag, is the live risk.

## Why the COPPA fix is required regardless of the declaration

COPPA's trigger is **actual knowledge**. The moment a user self-declares an under-13
birth year (the age screen from the prior pass writes `profiles.birth_year` /
guest localStorage), the app *knows* it has a child on the device. Serving that child
personalized ads is a violation **independent of** the Play declaration. Before this
pass, a known child got restricted social surfaces but **normal personalized ads** —
the one spot with real teeth.

### Fix (TDD)

- `lib/families/adPolicy.ts` — pure `shouldSuppressAdsForTier(tier)` → `tier === 'child'`.
  Shares the `SocialTier` vocabulary with `socialPolicy.ts` so ad gating can't drift
  from social gating.
- `contexts/AdMobContext.tsx` — reads the tier via `useSocialCapabilities()` (the same
  client mirror the social UI uses; `AuthProvider` sits above `AdMobProvider`).
  `hasNoAds()` (was hardcoded `false`) now returns `shouldSuppressAdsForTier(tier)`.
  That single chokepoint already gates **all three** ad formats — banner, interstitial,
  rewarded all early-return on `hasNoAds()` in `hooks/useAdMob.ts`.

### Mid-session guest declaration must take effect without reload

Under-13 users are overwhelmingly **guests** (COPPA discourages accounts), so the
guest path *is* the primary path for this fix. Guest birth year lives in localStorage
behind a per-hook-instance `useState` in `useSocialCapabilities` — so the instance that
*wrote* the age (AgeGateModal's) updated, but `AdMobProvider`'s own instance stayed
frozen at its mount-time value and kept serving ads until a cold start (same-tab
localStorage writes fire no `storage` event).

Fixed by making guest age **reactive across instances**: `writeGuestBirthYear` now
dispatches a `lc:guest-age-changed` window event, and `useSocialCapabilities` re-reads
on that event (and on cross-tab `storage`). A guest who declares under-13 mid-session
now stops seeing ads immediately. Proven by an **integration test with a real provider
tree** (`AdMobContext.guestAge.test.tsx`, no hook mock) — the unit test's mocked hook
structurally couldn't catch this.

### Why suppress, and only for `child`

- **Suppress (vs. non-personalized):** the AdMob plugin's child flags
  (`tagForChildDirectedTreatment` / `tagForUnderAgeOfConsent` / `maxAdContentRating`)
  are **init-only** — set once at `AdMob.initialize`, before a guest has declared an
  age, and not re-applicable per-user. Full suppression for the small known-child
  cohort is unambiguously compliant and needs zero native/init gymnastics.
- **Only `child`, not `unknown`:** an undeclared guest is *not* actual knowledge of a
  child. Suppressing every guest would gut ad revenue and isn't required. Adults +
  unknown keep general ad treatment — consistent with a mixed-audience listing — and
  the 15-40 core is untouched.
- **NOT blanket app-level `tagForChildDirectedTreatment`:** that would falsely signal
  the *whole app* is child-directed, contradicting the listing and becoming its own
  rejection vector.

## Owner actions (non-code — these decide re-review)

1. **Pick one posture and make declaration + behaviour agree:**
   - **Mixed / "10+ everyone"** (matches current code + the listing notes): keep
     admit-and-restrict; this ad fix + the social gates satisfy it. Then you also owe
     a Families-compliant ad setup if you ever want personalized ads for the under-13
     cohort — we don't, we suppress, so we're clean.
   - **No-children / "13+"** (matches CLAUDE.md intent): change the Play Console
     declaration to exclude under-13 **and** consider gating under-13 *entry* (today
     they keep playing). Smaller ad surface, but the declaration must then not say 10+.
   - **Do not leave the listing at "10+ / everyone" while CLAUDE.md says 15-40** — that
     mismatch is exactly what re-review catches.
2. **Child Safety Standards (CSAE):** the Social category requires a *published* CSAE
   standards page + an in-app child-safety point of contact. Not satisfiable in code.
3. **Optional ad hardening for a 10+/everyone listing:** set `maxAdContentRating` at
   `AdMob.initialize` (e.g. `MaxAdContentRating.Teen` or `ParentalGuidance`) so the
   broad audience never sees mature-rated ad creatives. This is a revenue/fill
   tradeoff and an owner call — left out of this pass deliberately; it's a one-line
   addition in `AdMobContext.tsx` when decided.

## Out of scope / known-separate

- iOS `Info.plist` carries Google's **test** `GADApplicationIdentifier`
  (`ca-app-pub-3940256099942544~...`) instead of the prod app id. Real bug, but native
  + iOS-release scope, unverifiable this session — track separately, do not blind-fix.
- **Authed-child cold-start window:** on a fresh launch an authenticated child's tier
  is `unknown` until `useAuth` loads `profile.birth_year`, so a banner/interstitial can
  preload in that brief window. `hasNoAds()` is re-checked at every *show*, so future
  shows are blocked the instant the tier flips — but an already-shown banner isn't
  retracted. Narrow (authed under-13 is a tiny cohort; most are guests) and
  non-blocking; left as a known limitation rather than adding banner-retraction logic.

## Verification

- `lib/families/adPolicy.test.ts` 3 · `AdMobContext.test.tsx` tier cases (unknown/adult
  serve, child suppress) + 17 existing = green · `socialPolicyServer` 9 = **37 green**
  in the families sweep. ESLint clean, no new `tsc` errors in changed files.
- Build: see PR (`npm run build`).

## Rollout

JS/web only → web deploy. Native app loads remote URL → reaches in-review binary 5713
with no AAB rebuild. Existing adults/guests unaffected; only known-under-13 users lose
ads (correct).
