# Android App-Install UX + Re-Entry + Tracking

**Date:** 2026-06-21
**Goal:** Improve the Android "Get the App" install UX, give players durable ways back to install after they close the popup, and track the whole funnel.

## Scope
Touch ONLY the Android web-install path. Do **not** modify `PWAInstallPrompt` (desktop/PWA) or `AndroidAppRedirect` (deep-link for already-installed). `utils/androidApp.ts` changes are additive — `shouldShowAndroidInstallPromo`'s existing branches stay byte-for-byte (the redirect shares the file).

## Problem
Today: auto-popup → dismiss → `dismissedUntil = now + 14d` → **total silence, no way back**. Events (`android_install_promo_shown/install_click/dismissed`) carry **no props**, so you cannot tell auto-popup from any re-entry, nor build a recovery funnel.

## Design

### Re-entry surfaces
1. **Menu row (durable, must-have):** "Get the App" row in `HeaderMobileMenu`, Android-browser only. Bypasses the cooldown (explicit user intent). Survives reloads. → opens popup `source:'menu'`.
2. **Session pill (secondary):** dismissing the popup collapses it to a small **top-anchored** pill (NOT bottom — that band already holds an AdMob banner on `isAllowedAdBannerRoute()` routes). In-memory/session only; resets on reload (menu row is the durable path). Own `×` hides it for the session. → tap reopens popup `source:'pill'`.

Dismiss STILL sets the 14-day auto-popup cooldown — re-entry is opt-in, not nagging.

### Shared state
`lib/androidInstall/androidInstallStore.ts` (zustand, in-memory UI only): `{ open, source, pillVisible, openPromo(source), closePromo(), showPill(), hidePill() }`. Storage writes + PostHog live in component handlers, not the store.

### Eligibility (pure, tested)
`lib/androidInstall/installEligibility.ts`: `isAndroidInstallEntryEligible({ ua, isCapacitorNative, isStandalone })` → menu/pill platform gate (android browser, not native shell, not standalone PWA). Reuses `isAndroidBrowser`.

### Popup UX upgrade
- Value-prop bullets (faster/native, play offline, streak reminders).
- Install button → reuse `PlayStoreCTA` badge → carries **install-referrer attribution** (current popup uses raw `PLAY_STORE_URL`, no referrer — strict improvement).
- Better hero asset (regenerated, anchored on real mascot). LAST priority.

### Tracking (`lib/androidInstall/installTracking.ts`)
Keep existing event NAMES (historical continuity), add `source`:
- `android_install_promo_shown` `{ source: 'auto_popup'|'menu'|'pill' }`
- `android_install_promo_install_click` `{ source }`
- `android_install_promo_dismissed` `{ source }`
New:
- `android_install_pill_shown`
- `android_install_pill_click`
- `android_install_pill_dismissed`
- `android_install_menu_click`

Funnel: `shown(auto_popup) → dismissed → pill_shown → {pill_click|menu_click} → install_click{source}`. No `growth:` prefix (existing Android events don't use it).

## Files
NEW: `lib/androidInstall/{androidInstallStore,installEligibility,installTracking}.ts` (+tests), `components/android-install/{AndroidInstallPill,GetAppMenuRow}.tsx` (+tests).
MOD: `components/AndroidAppInstallPromo.tsx`, `components/PlayStoreCTA.tsx` (additive optional `onClick`), `components/header/HeaderMobileMenu.tsx`, `app/[locale]/layout.tsx`, `translations/{en,he,sv,ja,es}.js`, hero asset.

## Verification
UA-gated + 12s delay + install-probe make live Android proof unreliable → prove via unit tests + UA spoofing. `npm run lint && test && build` on touched files.
