# Google Play Store Launch Checklist

## Pre-Requisites (Code Changes) ✅

- [x] AdMob App ID in AndroidManifest.xml (via `ADMOB_APP_ID` env var)
- [x] `assetlinks.json` served at `www.lexiclash.live/.well-known/`
- [x] Offline fallback page in `capacitor-assets/index.html`
- [x] ProGuard rules for Capacitor, AdMob, Firebase, Social Login
- [x] `google-services.json` gitignored (inject via CI)
- [x] Deep links configured (lexiclash:// + App Links)
- [x] Push notifications (FCM) fully implemented
- [x] Privacy policy page at `/legal/privacy`
- [x] Terms of service page at `/legal/terms`

## Environment Variables for Release Build

Set these before running `npm run mobile:android:play`:

| Variable | Description | Required |
|----------|-------------|----------|
| `VERSION_CODE` | Integer, increment each release (1, 2, 3...) | Yes |
| `VERSION_NAME` | Semantic version (1.0.0) | Yes |
| `ANDROID_KEYSTORE_PATH` | Path to release keystore file | Yes |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | Yes |
| `ANDROID_KEY_ALIAS` | Key alias (e.g., "lexiclash") | Yes |
| `ANDROID_KEY_PASSWORD` | Key password | Yes |
| `ADMOB_APP_ID` | AdMob Application ID (ca-app-pub-XXX~YYY) | Yes |
| `NEXT_PUBLIC_ADMOB_REWARDED_ID` | Rewarded ad unit ID | Yes |
| `NEXT_PUBLIC_ADMOB_BANNER_ID` | Banner ad unit ID | Yes |
| `NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID` | Interstitial ad unit ID | Yes |
| `NEXT_PUBLIC_ADMOB_REWARDED_INTERSTITIAL_ID` | Rewarded interstitial ad unit ID | Yes |

## Generate Release Keystore (One-Time)

```bash
keytool -genkey -v \
  -keystore lexiclash-release.keystore \
  -alias lexiclash \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_PASSWORD \
  -keypass YOUR_PASSWORD \
  -dname "CN=LexiClash, O=LexiClash, C=IL"
```

**IMPORTANT**: Back up this keystore securely. If lost, you cannot update the app on Play Store.

Enroll in **Google Play App Signing** (recommended) — Google holds the upload key, you keep a separate upload key.

## Build & Upload

```bash
# 1. Sync Capacitor
cd fe-next && npm run mobile:sync

# 2. Build signed AAB
npm run mobile:android:play

# 3. Output: android/app/build/outputs/bundle/release/app-release.aab
# Upload this to Play Console
```

## Play Console Setup

### Store Listing (all required)
- [ ] **App name**: LexiClash (max 30 chars)
- [x] **Short description**: 80 chars max, in all supported languages — see `docs/PLAY_STORE_LISTING.md`
- [x] **Full description**: 4000 chars max, in all supported languages — see `docs/PLAY_STORE_LISTING.md`
- [ ] **App icon**: 512x512 PNG, 32-bit, no alpha
- [ ] **Feature graphic**: 1024x500 PNG or JPG
- [ ] **Phone screenshots**: Min 2, max 8 (16:9 or 9:16, min 320px, max 3840px)
- [ ] **7-inch tablet screenshots**: Min 2 (recommended)
- [ ] **10-inch tablet screenshots**: Min 2 (recommended)
- [ ] **App category**: Games > Word
- [ ] **Tags**: word game, multiplayer, boggle, vocabulary
- [ ] **Contact email**: Required
- [ ] **Privacy policy URL**: `https://www.lexiclash.live/en/legal/privacy`
- [x] **Account deletion URL**: `https://www.lexiclash.live/en/account/delete`

### Content Rating
- [ ] Fill out **IARC questionnaire** in Play Console
- [ ] Expected rating: PEGI 3 / Everyone (no violence, no gambling with real money)
- [ ] Declare presence of ads

### Target Audience & Content
- [ ] Declare target age group (likely 13+, or "Not designed for children")
- [ ] If targeting under 13: must comply with **Families Policy** and COPPA
- [ ] **Recommendation**: Target 13+ to avoid Families Policy requirements

### Ads Declaration
- [ ] Confirm app contains ads
- [ ] Ads comply with Google's ad policy (no deceptive, no inappropriate)
- [ ] If targeting children: ads must be from Google-certified ad networks only

### Data Safety Form
See section below for exact declarations.

## Data Safety Declarations

Fill these in Play Console under **Data Safety**:

### Data Collected

| Data Type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| Email address | Yes | No | Account management, auth | No (required for account) |
| Name/display name | Yes | No | App functionality (profile) | Yes |
| Profile photo | Yes | No | App functionality (avatar) | Yes |
| Game progress | Yes | No | App functionality | No |
| In-game purchases | Yes | No | App functionality (coins) | No |
| Device ID (FCM token) | Yes | No | Push notifications | Yes (user can decline) |
| Crash logs | Yes | No | Analytics, diagnostics | No |
| Performance diagnostics | Yes | No | Analytics | No |
| App interactions | Yes | No | Analytics (Supabase analytics) | No |
| Advertising ID | Yes | Yes (AdMob/Google) | Advertising | No |

### Security Practices
- [x] Data encrypted in transit (HTTPS)
- [x] Data can be deleted (user can request account deletion)
- [x] Account deletion flow — in-app (Settings) + web page (/account/delete)

### Important Notes
- If using Google Sign-In: declare you collect authentication tokens
- AdMob collects advertising ID automatically — must disclose
- Supabase analytics events — declare as "app interactions"
- Sentry crash reporting — declare as "crash logs"

## Account Deletion Requirement

**Google Play requires** that apps offering account creation must also allow users to delete their account and data. You need:

1. An in-app "Delete Account" button (in Settings/Profile)
2. A web-based deletion option (for users who uninstalled)
3. Actually delete user data from Supabase within a reasonable timeframe

## Testing Track Strategy

1. **Internal testing** (up to 100 testers) — immediate availability, no review
2. **Closed testing** (alpha/beta) — invite specific testers, triggers review
3. **Open testing** — anyone can join via link
4. **Production** — start with **staged rollout** (10% → 25% → 50% → 100%)

## Pre-Launch Report

After uploading to internal testing, Google runs automated tests:
- Accessibility issues
- Security vulnerabilities
- Performance problems
- Crash detection on multiple devices

Review results before promoting to production.

## Post-Launch

- [ ] Monitor Android Vitals (ANR rate < 0.47%, crash rate < 1.09%)
- [ ] Respond to user reviews within 24h
- [ ] Set up staged rollouts for updates
- [ ] Monitor AdMob revenue and fill rates
