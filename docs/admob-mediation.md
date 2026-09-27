# AdMob Mediation Runbook

Target: lift rewarded + interstitial eCPM on native (iOS/Android) by letting
AppLovin, Unity Ads, and Meta Audience Network bid alongside AdMob.

This is ~10% code / ~90% dashboard-and-account work. Do it in order. Don't
merge the code PR until the dashboard groups are ready — otherwise you ship
bigger native binaries with nothing to bid.

---

## Phase 1 — Network accounts (blocks Phase 2)

One sign-up per network. Each needs a legal entity, tax form (W-9 or W-8BEN),
and payout bank info. All three are free to join.

1. **AppLovin MAX** — https://www.applovin.com/max
   - Create publisher account.
   - Add the iOS + Android apps by bundle ID.
   - Under **MAX → Applications**, copy the SDK Key and the two Ad Unit IDs
     (rewarded + interstitial) per app.

2. **Unity Ads (LevelPlay)** — https://dashboard.unity3d.com/monetization
   - Create Unity organization → project.
   - Add the two apps. Copy the Game IDs (iOS + Android).
   - Create rewarded + interstitial placements. Copy placement IDs.

3. **Meta Audience Network** — https://www.facebook.com/audiencenetwork
   - Requires a Meta Business Manager ID.
   - Register the apps, copy the Placement IDs (one per format per platform).

Expected turnaround: **1–5 business days** for each account (tax + identity
review). Don't proceed until all three are in "active" state.

---

## Phase 2 — AdMob dashboard mediation groups

In https://apps.admob.com → **Mediation → Create mediation group**.

Do this twice — once for rewarded, once for interstitial. Then again per
platform (iOS + Android), so 4 groups total.

For each group:

1. Ad format + platform + location (start with `All`).
2. Add ad sources in this order:
   - **Google (AdMob Network)** — always include. eCPM floor: `dynamic`.
   - **AdMob bidding** (if enabled in your account) — include with bidding.
   - **AppLovin MAX** — bidding preferred, otherwise add as waterfall with
     eCPM floors (start at $8 → $4 → $2 → $0.50).
   - **Unity Ads** — waterfall with eCPM floors.
   - **Meta Audience Network** — bidding preferred; fallback to waterfall.
3. Set refresh/frequency policy to match the app's existing interstitial cap
   (see `fe-next/contexts/AdMobContext.tsx:shouldShowInterstitial` — every 3
   games post-warmup).
4. Assign the group to the **existing** AdMob ad unit IDs so we don't have
   to re-issue IDs in `fe-next/lib/admob-config.ts`.

Enable **Bidding** wherever the network supports it. Bidding > waterfall
because every impression sees a live auction instead of a fixed priority.

---

## Phase 3 — Capacitor adapter packages (the code part)

`@capacitor-community/admob` is already installed. It relies on the native
Google Mobile Ads SDK, which reads adapter frameworks from the native
project. We add those adapters via:

### Android (`android/app/build.gradle`)

Add under `dependencies`:

```gradle
// AdMob mediation adapters
implementation "com.applovin.mediation:google-adapter:13.0.0.0"
implementation "com.google.ads.mediation:unity:4.12.2.0"
implementation "com.google.ads.mediation:facebook:6.17.0.0"
```

Check for the latest adapter versions at
https://developers.google.com/admob/android/choose-networks

Also add to `android/app/src/main/AndroidManifest.xml` inside `<application>`:

```xml
<!-- Meta Audience Network -->
<meta-data
  android:name="com.facebook.sdk.ApplicationId"
  android:value="@string/facebook_app_id"/>
<!-- AppLovin -->
<meta-data
  android:name="applovin.sdk.key"
  android:value="YOUR_APPLOVIN_SDK_KEY"/>
```

### iOS (`ios/App/Podfile`)

Add to the `target 'App'` block:

```ruby
pod 'GoogleMobileAdsMediationAppLovin', '~> 13.0'
pod 'GoogleMobileAdsMediationUnity',    '~> 4.12'
pod 'GoogleMobileAdsMediationMeta',     '~> 6.17'
```

Then: `npx cap sync ios && cd ios/App && pod install`.

In `ios/App/App/Info.plist`, add the App-ID keys each adapter requires
(AppLovin `SDKKey`, Meta `FacebookAppID`, etc. — check each adapter's
README; they change every major release).

### Test builds

On a physical device (emulators rarely fill mediated inventory):

1. Enable test mode for each network (AdMob settings → Test devices).
2. Run a rewarded ad 5+ times. In AdMob console **Diagnostics**, confirm
   impressions from at least Google + one other network.
3. If a network never fills: it's a dashboard/account issue, not code.
   Check ad unit status in that network's dashboard.

---

## Phase 4 — Monitor

- AdMob console **Mediation → Analytics** — eCPM by network per day.
- Watch for networks stuck at 0 impressions after 48h: usually SDK key
  typo, app not in "active" state, or placement mismatch.
- Typical uplift (industry): **15–30% eCPM** vs AdMob-only, realized after
  the networks have a week of fill data to calibrate bids.

---

## Non-goals for this runbook

- **ATT prompt (iOS 14+)** — separate task. Without ATT, iOS rewarded eCPM
  is ~40% lower but mediation still works. Track in its own card.
- **GDPR/CCPA CMP extensions** — already covered by Google Consent Mode v2
  in `components/GoogleConsentMode.tsx`; networks inherit consent signals
  automatically.
- **Web/AdSense for Games H5** — separate path (see
  `hooks/useAdPlacement.ts`), not relevant to native mediation.
