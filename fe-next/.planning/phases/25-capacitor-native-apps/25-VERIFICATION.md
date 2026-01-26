---
phase: 25-capacitor-native-apps
verified: 2026-01-26T07:12:00Z
status: gaps_found
score: 8/13 must-haves verified

gaps:
  - truth: "Safe area hook provides device insets for notched devices"
    status: failed
    reason: "useSafeArea hook exists but is never called anywhere in the app"
    artifacts:
      - path: "hooks/useSafeArea.ts"
        issue: "Hook defined but not imported or used in any component"
      - path: "components/layout/GamePageWrapper.tsx"
        issue: "Has 'useSafeArea' prop but doesn't import or call the hook"
    missing:
      - "Import useSafeArea hook in GamePageWrapper or root layout"
      - "Call useSafeArea() to set CSS custom properties on mount"
      - "Verify --cap-safe-area-* variables are set on native devices"
  
  - truth: "Offline fallback screen shows when server unreachable in native app"
    status: failed
    reason: "OfflineFallback component exists but is never rendered"
    artifacts:
      - path: "components/native/OfflineFallback.tsx"
        issue: "Component defined but not imported or used anywhere"
    missing:
      - "Add network detection logic in Capacitor app initialization"
      - "Render OfflineFallback when navigator.onLine is false"
      - "Integrate with app root or error boundary"
  
  - truth: "Native haptics enhance user feedback on iOS and Android"
    status: failed
    reason: "Native haptics utilities exist but are never called in UI components"
    artifacts:
      - path: "utils/nativeHaptics.ts"
        issue: "Utilities defined but not imported anywhere"
      - path: "hooks/useNativeHaptics.ts"
        issue: "Hook defined but not used in any component"
    missing:
      - "Import useNativeHaptics in interactive components (buttons, game actions)"
      - "Call vibrateTap() on button presses"
      - "Call vibrateSuccess() on correct word found"
      - "Call vibrateError() on invalid word"
  
  - truth: "App lifecycle hook fires callbacks on foreground/background transitions"
    status: failed
    reason: "useAppLifecycle hook exists but is never used"
    artifacts:
      - path: "hooks/useAppLifecycle.ts"
        issue: "Hook defined but not imported or used anywhere"
    missing:
      - "Import useAppLifecycle in root layout or game components"
      - "Use onForeground callback to resume Socket.IO connections"
      - "Use onBackground callback to pause timers or cleanup"
  
  - truth: "Socket.IO connections work in native WebView"
    status: uncertain
    reason: "No evidence of testing or validation in native WebView environment"
    artifacts:
      - path: "capacitor.config.ts"
        issue: "Comment says 'Do NOT use CapacitorHttp' but no verification Socket.IO works"
    missing:
      - "Test Socket.IO multiplayer in iOS simulator/device"
      - "Test Socket.IO multiplayer in Android emulator/device"
      - "Verify WebSocket connections establish correctly"
      - "Document test results or add integration test"
---

# Phase 25: Capacitor Native Apps Integration Verification Report

**Phase Goal:** Integrate Capacitor to create native iOS and Android apps from the Next.js webapp with minimal code maintenance overhead

**Verified:** 2026-01-26T07:12:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                  | Status        | Evidence                                                           |
| --- | ---------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| 1   | Capacitor core packages are installed and configured                  | ✓ VERIFIED    | @capacitor/core, ios, android, cli in package.json                 |
| 2   | iOS and Android platforms are added to project                        | ✓ VERIFIED    | ios/ and android/ directories exist with native projects           |
| 3   | Native app loads production webapp in WebView                         | ✓ VERIFIED    | capacitor.config.ts server.url: https://www.lexiclash.live         |
| 4   | Socket.IO connections work in native WebView                          | ? UNCERTAIN   | No evidence of testing, only config comment                        |
| 5   | Platform detection utility identifies native vs web environment       | ✓ VERIFIED    | utils/platform.ts exports isNative, isIOS, isAndroid, isWeb        |
| 6   | Native haptics wrapper falls back to web vibration API                | ✓ VERIFIED    | utils/nativeHaptics.ts checks isNative() before Capacitor call     |
| 7   | Native haptics enhance user feedback on iOS and Android               | ✗ FAILED      | Utilities exist but never called in UI components                  |
| 8   | App lifecycle hook fires callbacks on foreground/background           | ✗ FAILED      | Hook exists but never used in any component                        |
| 9   | Safe area hook provides device insets for notched devices             | ✗ FAILED      | Hook exists but never called, CSS properties never set             |
| 10  | CSS custom properties are set for safe area insets                    | ✗ FAILED      | CSS variables defined but useSafeArea() never called               |
| 11  | Offline fallback screen shows when server unreachable                 | ✗ FAILED      | Component exists but never rendered                                |
| 12  | Build scripts generate iOS and Android app bundles                    | ✓ VERIFIED    | scripts/mobile/ contains build-ios.sh, build-android.sh            |
| 13  | npm scripts provide convenient build commands                         | ✓ VERIFIED    | mobile:sync, mobile:ios, mobile:android in package.json            |

**Score:** 8/13 truths verified (5 failed)

### Required Artifacts

| Artifact                                  | Expected                                              | Status     | Details                                            |
| ----------------------------------------- | ----------------------------------------------------- | ---------- | -------------------------------------------------- |
| `capacitor.config.ts`                     | Capacitor configuration with server.url               | ✓ VERIFIED | 58 lines, server.url, plugins config               |
| `package.json`                            | Capacitor dependencies                                | ✓ VERIFIED | @capacitor/core, ios, android, cli, plugins        |
| `utils/platform.ts`                       | Platform detection (isNative, isIOS, etc.)            | ✓ VERIFIED | 63 lines, 5 exports, try-catch fallback            |
| `utils/nativeHaptics.ts`                  | Native haptics with web fallback                      | ✓ VERIFIED | 62 lines, 3 exports, isNative check                |
| `hooks/useAppLifecycle.ts`                | App foreground/background callbacks                   | ⚠️ ORPHANED | 88 lines, defined but not used anywhere            |
| `hooks/useNativeHaptics.ts`               | Hook wrapper for native haptics                       | ⚠️ ORPHANED | 78 lines, defined but not used anywhere            |
| `hooks/useSafeArea.ts`                    | Safe area insets from Capacitor plugin                | ⚠️ ORPHANED | 89 lines, defined but not called anywhere          |
| `components/native/OfflineFallback.tsx`   | Offline fallback screen                               | ⚠️ ORPHANED | 93 lines, defined but not rendered anywhere        |
| `scripts/mobile/build-ios.sh`             | iOS build script                                      | ✓ VERIFIED | 85 lines, executable, contains xcodebuild          |
| `scripts/mobile/build-android.sh`         | Android build script                                  | ✓ VERIFIED | 91 lines, executable, contains gradlew             |
| `scripts/mobile/sync-native.sh`           | Capacitor sync helper                                 | ✓ VERIFIED | 26 lines, executable, contains npx cap sync        |
| `ios/` and `android/`                     | Native platform directories                           | ✓ VERIFIED | Both directories exist with Xcode/Gradle projects  |
| `translations/{en,he,sv,ja}.js`           | Native offline translations                           | ✓ VERIFIED | native.offline.{title,message,retry,retrying}      |

### Key Link Verification

| From                         | To                          | Via                              | Status      | Details                                                   |
| ---------------------------- | --------------------------- | -------------------------------- | ----------- | --------------------------------------------------------- |
| capacitor.config.ts          | https://www.lexiclash.live  | server.url configuration         | ✓ WIRED     | Production URL configured                                 |
| utils/nativeHaptics.ts       | utils/hapticFeedback.ts     | fallback import                  | ✓ WIRED     | Web fallback imported and called                          |
| hooks/useNativeHaptics.ts    | utils/nativeHaptics.ts      | utility import                   | ✓ WIRED     | Utilities imported and wrapped                            |
| hooks/useSafeArea.ts         | app/globals.css             | CSS custom properties            | ✗ NOT_WIRED | Hook sets properties but hook never called                |
| components/native/OfflineFallback.tsx | translations     | useLanguage hook                 | ✓ WIRED     | Translations imported and used                            |
| GamePageWrapper              | hooks/useSafeArea.ts        | Expected import                  | ✗ NOT_WIRED | Has useSafeArea prop but doesn't import/call hook         |
| UI components                | hooks/useNativeHaptics.ts   | Expected import                  | ✗ NOT_WIRED | No components import or use haptics                       |
| Root layout/app              | components/native/OfflineFallback.tsx | Expected render   | ✗ NOT_WIRED | Component never rendered anywhere                         |
| package.json                 | scripts/mobile/*.sh         | npm scripts                      | ✓ WIRED     | mobile:sync, mobile:ios, mobile:android configured        |

### Requirements Coverage

No requirements explicitly mapped to Phase 25 in REQUIREMENTS.md.

From ROADMAP.md success criteria:
- ✓ Native apps load production webapp in WebView (server.url approach)
- ? All webapp features work including SSR, Server Components, and Socket.IO multiplayer (not tested)
- ✗ Safe areas display correctly on notched devices (useSafeArea never called)
- ✗ Native haptics enhance user feedback (utilities not integrated)
- ✗ Offline fallback screen appears when server unreachable (component not rendered)
- ✓ Build scripts generate iOS and Android app bundles
- ? UI looks consistent across desktop, mobile web, and native apps (not tested)

### Anti-Patterns Found

No critical anti-patterns found. Code quality is good:
- No TODO/FIXME comments
- No placeholder content
- No stub implementations
- All files are substantive (26-93 lines)
- Proper error handling with try-catch
- Graceful degradation for web environment

**Issue:** Components and hooks are complete implementations but **not integrated**.

### Human Verification Required

The following items require human testing on physical devices or emulators:

#### 1. Socket.IO in Native WebView

**Test:** 
1. Build and install iOS app on simulator/device
2. Build and install Android app on emulator/device
3. Start a multiplayer game
4. Verify real-time Socket.IO updates work correctly

**Expected:** 
- WebSocket connections establish
- Real-time game updates appear
- No CORS or connection errors
- Multiplayer features work identically to web

**Why human:** Can't programmatically verify WebSocket behavior in native WebView without running the app.

#### 2. Safe Area Insets on Notched Devices

**Test:**
1. Once useSafeArea hook is integrated (see gaps)
2. Run app on iPhone X+ or Android device with notch/cutout
3. Verify UI doesn't overlap with status bar or home indicator
4. Check landscape and portrait orientations

**Expected:**
- Content respects safe areas
- No overlap with system UI
- Dynamic updates on orientation change

**Why human:** Safe area behavior is visual and device-specific.

#### 3. Native Haptics Feel

**Test:**
1. Once native haptics are integrated (see gaps)
2. Interact with buttons and game actions on physical device
3. Feel haptic feedback on button press, success, error

**Expected:**
- Light tap on button press
- Success pattern on correct word
- Error pattern on invalid word
- Graceful fallback on web

**Why human:** Haptic feedback is a physical sensation, can't be programmatically verified.

#### 4. Offline Fallback Screen

**Test:**
1. Once OfflineFallback is integrated (see gaps)
2. Disconnect device from internet
3. Open native app
4. Verify offline screen appears
5. Reconnect and press "Try Again"

**Expected:**
- Offline screen appears immediately when no connection
- Branded UI matches app theme
- Retry button reloads and connects
- Translations work for all languages

**Why human:** Network state testing requires physical device testing.

### Gaps Summary

**5 critical gaps prevent goal achievement:**

1. **useSafeArea hook orphaned** — Hook exists but never called. Safe area insets will always be zero on native, causing UI overlap on notched devices. Need to import and call `useSafeArea()` in root layout or GamePageWrapper.

2. **OfflineFallback component orphaned** — Component exists but never rendered. When native app loses connection, users will see generic browser error instead of branded experience. Need to add network detection and render OfflineFallback.

3. **Native haptics orphaned** — Utilities and hook exist but not integrated into UI. Users won't feel any haptic feedback on native. Need to import `useNativeHaptics` in interactive components and call on button press, success, error.

4. **useAppLifecycle orphaned** — Hook exists but unused. App won't respond to foreground/background transitions. Should use for resuming Socket.IO connections or pausing timers.

5. **Socket.IO not verified in native** — No evidence of testing Socket.IO in native WebView. Critical risk that multiplayer might not work on native despite working on web.

**Pattern:** All utilities and components are **complete implementations** but **not wired into the app**. This suggests Plan 04 stopped after creating files without integrating them.

---

_Verified: 2026-01-26T07:12:00Z_
_Verifier: Claude (gsd-verifier)_
