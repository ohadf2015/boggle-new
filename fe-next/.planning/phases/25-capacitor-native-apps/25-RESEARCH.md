# Phase 25: Capacitor Native Apps Integration - Research

**Researched:** 2026-01-26
**Domain:** Capacitor, Next.js, Mobile App Development
**Confidence:** MEDIUM

## Summary

This research investigates integrating Capacitor with the existing Next.js 16 LexiClash webapp to create native iOS and Android apps with minimal code maintenance overhead. The project presents a **unique challenge**: it uses SSR, Server Components, API routes, and real-time WebSockets via Socket.IO - features that are **NOT compatible** with Capacitor's standard static export approach.

Two viable approaches exist:
1. **WebView pointing to hosted webapp** (server.url configuration) - Load the production webapp in a native WebView shell, preserving ALL existing functionality including SSR, Server Components, and real-time features
2. **Static export with refactoring** - Convert to static export (`output: 'export'`), which requires removing SSR, Server Components, API routes, and using client-side alternatives

Given the user's requirement for **minimal code maintenance**, the **WebView approach is strongly recommended**. This allows the native apps to simply wrap the existing webapp without any refactoring, ensuring perfect feature parity and zero code duplication.

**Primary recommendation:** Use Capacitor's `server.url` configuration to point native apps to the hosted webapp (https://www.lexiclash.live), preserving all existing functionality while adding native app distribution via App Store and Google Play.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @capacitor/core | 8.x | Core runtime for native bridge | Official Capacitor package, maintained by Ionic |
| @capacitor/cli | 8.x | CLI for managing native projects | Required for init, sync, build commands |
| @capacitor/ios | 8.x | iOS platform support | Official iOS platform package |
| @capacitor/android | 8.x | Android platform support | Official Android platform package |

### Supporting (Relevant for Word Game)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @capacitor/app | 8.x | App lifecycle events (foreground/background) | Pause/resume game state |
| @capacitor/status-bar | 8.x | Control native status bar | Match app theme to status bar |
| @capacitor/splash-screen | 8.x | Native splash screen | Branded loading experience |
| @capacitor/keyboard | 8.x | Control native keyboard behavior | Word input optimization |
| @capacitor/haptics | 8.x | Vibration feedback | Game interactions (correct/incorrect) |
| @capacitor/share | 8.x | Native share functionality | Share scores/achievements |
| @capacitor/preferences | 8.x | Key-value storage | Offline settings persistence |
| capacitor-plugin-safe-area | latest | Safe area insets for notches | UI consistency across devices |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Capacitor (WebView) | React Native | Would require complete rewrite; higher maintenance burden |
| Capacitor (WebView) | PWA only | No App Store presence; limited native features |
| Capacitor (WebView) | Static Export | Would require removing SSR, Server Components, API routes |
| server.url approach | Static export | Loses SSR, needs refactoring, breaks existing features |

**Installation:**
```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init "LexiClash" "live.lexiclash.app" --web-dir=out
npm install @capacitor/ios @capacitor/android
npm install @capacitor/app @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard @capacitor/haptics @capacitor/share @capacitor/preferences
npx cap add ios
npx cap add android
```

## Architecture Patterns

### Recommended Project Structure
```
fe-next/
├── ios/                    # Capacitor iOS project (gitignored)
│   └── App/
│       ├── App/
│       │   ├── capacitor.config.json
│       │   └── Info.plist
│       └── App.xcworkspace
├── android/                # Capacitor Android project (gitignored)
│   └── app/
│       ├── src/main/
│       │   ├── AndroidManifest.xml
│       │   └── java/live/lexiclash/app/MainActivity.java
│       └── build.gradle
├── capacitor.config.ts     # Main Capacitor configuration
├── scripts/
│   └── mobile/
│       ├── build-ios.sh
│       ├── build-android.sh
│       └── generate-icons.sh
└── public/
    └── native/
        ├── splash-ios/     # iOS splash screen assets
        └── splash-android/ # Android splash screen assets
```

### Pattern 1: WebView Wrapper (Recommended)
**What:** Configure Capacitor to load the hosted webapp in a WebView
**When to use:** When the webapp uses SSR, Server Components, or features requiring a server
**Example:**
```typescript
// capacitor.config.ts
// Source: https://capacitorjs.com/docs/config
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'live.lexiclash.app',
  appName: 'LexiClash',
  webDir: 'public', // Minimal fallback assets only
  server: {
    // Production: Load from hosted webapp
    url: 'https://www.lexiclash.live',
    // Allow WebSocket connections for Socket.IO
    cleartext: false, // HTTPS only
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e', // neo-navy
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'lexiclash',
  },
  android: {
    allowMixedContent: true, // Required for WebSocket handshake
    captureInput: true,
    webContentsDebuggingEnabled: false, // Disable in production
  },
};

export default config;
```

### Pattern 2: Development Configuration
**What:** Point to local dev server during development
**When to use:** Active development and testing
**Example:**
```typescript
// capacitor.config.ts (development override)
const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  // ... base config
  server: isDev ? {
    url: 'http://192.168.1.100:3000', // Local IP for LAN access
    cleartext: true, // Allow HTTP in dev
  } : {
    url: 'https://www.lexiclash.live',
    cleartext: false,
  },
};
```

### Pattern 3: Platform Detection
**What:** Detect if running in native app vs web browser
**When to use:** Enable native features only when available
**Example:**
```typescript
// utils/platform.ts
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

// Usage in component
if (isNative) {
  // Use native haptics
  await Haptics.impact({ style: ImpactStyle.Medium });
} else {
  // Web fallback (none or CSS animation)
}
```

### Anti-Patterns to Avoid
- **Mixing static export with SSR features:** Don't try to use Server Components or API routes with static export - they will silently break or throw build errors
- **CapacitorHttp with Socket.IO:** Do NOT enable CapacitorHttp plugin as it interferes with WebSocket connections and causes "unsupported version" errors
- **Hardcoding native URLs:** Don't hardcode localhost URLs in production configs
- **Ignoring safe areas:** Always account for device notches and status bars using safe area plugins

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Safe area insets | Manual padding calculations | capacitor-plugin-safe-area | Handles all device variants, notches, home indicators |
| Native splash screen | Web-based loading screen | @capacitor/splash-screen | Shows immediately, native performance |
| App state management | Custom visibility listeners | @capacitor/app | Proper lifecycle events, background/foreground |
| Native sharing | Web Share API | @capacitor/share | Better native integration, more options |
| Keyboard handling | Manual resize listeners | @capacitor/keyboard | Proper native keyboard events |
| Device info | User agent parsing | @capacitor/device | Accurate platform/version detection |

**Key insight:** Capacitor plugins handle platform-specific edge cases that would take significant effort to replicate. The native bridge overhead is minimal compared to development time saved.

## Common Pitfalls

### Pitfall 1: Socket.IO Connection Failures
**What goes wrong:** Socket.IO fails to connect with "unsupported version" error on native apps
**Why it happens:** CapacitorHttp plugin intercepts WebSocket requests and corrupts the handshake
**How to avoid:** Do NOT install @capacitor/http plugin, or disable it entirely in capacitor.config.ts
**Warning signs:** HTTP 400 errors, "unsupported version" messages in console

### Pitfall 2: CORS Issues with WebView
**What goes wrong:** API requests fail with CORS errors on native apps
**Why it happens:** WebView has different origin than server expects
**How to avoid:** Ensure server allows requests from capacitor://localhost (iOS) and http://localhost (Android)
**Warning signs:** Network requests fail silently, API data doesn't load

### Pitfall 3: Next.js Image Optimization Breaking
**What goes wrong:** Images don't load or show optimization errors
**Why it happens:** Next.js Image optimization requires server-side processing
**How to avoid:** When using server.url approach (WebView), this is NOT an issue - images are served from the hosted webapp. Only affects static export approach.
**Warning signs:** Image loading errors, blurry images, 404s

### Pitfall 4: iOS App Store Rejection for UIWebView
**What goes wrong:** App rejected for using deprecated UIWebView
**Why it happens:** Old Capacitor versions or Cordova plugins use UIWebView
**How to avoid:** Use Capacitor 6+ (uses WKWebView), audit all plugins for UIWebView usage
**Warning signs:** ITMS-90809 rejection emails from Apple

### Pitfall 5: Android Safe Area Not Working
**What goes wrong:** Content appears behind status bar or navigation buttons
**Why it happens:** Android Chromium versions < 140 don't report safe areas correctly
**How to avoid:** Use @capacitor/system-bars or capacitor-plugin-safe-area plugins
**Warning signs:** Content cut off at edges, UI elements behind system bars

### Pitfall 6: OAuth/Supabase Auth Redirect Issues
**What goes wrong:** OAuth login redirects to browser instead of app, session lost
**Why it happens:** Deep links not configured, redirect URI doesn't match app scheme
**How to avoid:** Configure custom URL scheme (lexiclash://), set up universal links, use PKCE flow
**Warning signs:** Auth works in browser, fails in native app

### Pitfall 7: RTL Layout Issues
**What goes wrong:** Hebrew text displays incorrectly or shadows flip wrong direction
**Why it happens:** WebView may not respect HTML dir attribute properly on some Android versions
**How to avoid:** This is handled at CSS level, which LexiClash already does correctly. WebView inherits CSS direction.
**Warning signs:** Shadows on wrong side, text alignment issues in Hebrew

## Code Examples

Verified patterns from official sources:

### Capacitor Initialization
```typescript
// capacitor.config.ts
// Source: https://capacitorjs.com/docs/config
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'live.lexiclash.app',
  appName: 'LexiClash',
  webDir: 'public',
  server: {
    url: 'https://www.lexiclash.live',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
    },
  },
};

export default config;
```

### App Lifecycle Handling
```typescript
// hooks/useAppLifecycle.ts
// Source: https://capacitorjs.com/docs/apis/app
import { App } from '@capacitor/app';
import { useEffect } from 'react';

export function useAppLifecycle(
  onForeground: () => void,
  onBackground: () => void
) {
  useEffect(() => {
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        onForeground();
      } else {
        onBackground();
      }
    });

    return () => {
      listener.remove();
    };
  }, [onForeground, onBackground]);
}
```

### Safe Area Handling
```typescript
// hooks/useSafeArea.ts
// Source: https://github.com/capacitor-community/safe-area
import { SafeArea } from 'capacitor-plugin-safe-area';
import { useState, useEffect } from 'react';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0, bottom: 0, left: 0, right: 0
  });

  useEffect(() => {
    SafeArea.getSafeAreaInsets().then(({ insets }) => {
      setInsets(insets);
    });
  }, []);

  return insets;
}

// Usage in CSS custom properties
useEffect(() => {
  document.documentElement.style.setProperty('--safe-area-top', `${insets.top}px`);
  document.documentElement.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
}, [insets]);
```

### Native Haptics
```typescript
// utils/haptics.ts
// Source: https://capacitorjs.com/docs/apis/haptics
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export async function vibrateSuccess() {
  if (Capacitor.isNativePlatform()) {
    await Haptics.notification({ type: NotificationType.Success });
  }
}

export async function vibrateError() {
  if (Capacitor.isNativePlatform()) {
    await Haptics.notification({ type: NotificationType.Error });
  }
}

export async function vibrateTap() {
  if (Capacitor.isNativePlatform()) {
    await Haptics.impact({ style: ImpactStyle.Light });
  }
}
```

### Android Manifest Configuration
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:usesCleartextTraffic="false"
    android:theme="@style/AppTheme">

    <!-- Enable mixed content for WebSocket handshake -->
    <meta-data android:name="com.google.android.gms.version"
        android:value="@integer/google_play_services_version" />
</application>
```

### iOS Info.plist Configuration
```xml
<!-- ios/App/App/Info.plist -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>lexiclash</string>
        </array>
    </dict>
</array>
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>https</string>
</array>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UIWebView (iOS) | WKWebView | Capacitor 3+ (2021) | Required for App Store approval |
| Cordova plugins | Capacitor plugins | Capacitor 1.0 (2019) | Modern API, better TypeScript support |
| Manual safe areas | System Bars plugin | Capacitor 6+ (2024) | Automatic safe area handling |
| HTTP polling | Native WebSocket | Always supported | Real-time features work |
| Static export only | server.url for SSR | Always supported | WebView can load any URL |

**Deprecated/outdated:**
- UIWebView: Rejected by Apple since April 2020
- Cordova: Still works but Capacitor plugins are preferred
- CapacitorHttp for apps with WebSockets: Causes conflicts, avoid

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase OAuth Flow in Native**
   - What we know: OAuth redirects need custom URL scheme, PKCE flow works
   - What's unclear: Exact configuration for Supabase + Capacitor + Next.js Auth
   - Recommendation: Test OAuth flow early, may need @capgo/capacitor-social-login plugin

2. **Socket.IO Performance on Mobile**
   - What we know: WebSocket transport works, CapacitorHttp must be disabled
   - What's unclear: Reconnection behavior on network switch (WiFi to cellular)
   - Recommendation: Test real-world network conditions, may need connection retry logic

3. **App Store OTA Update Limits**
   - What we know: Apple allows JavaScript/asset updates only, not native code
   - What's unclear: How strictly Apple enforces for WebView apps loading external URLs
   - Recommendation: Using server.url naturally allows instant updates without App Store review

4. **Bundle Size Impact**
   - What we know: Native shell is small (~5MB), web content loads from server
   - What's unclear: Initial load time on slow connections
   - Recommendation: Add offline fallback screen for when server unreachable

## Sources

### Primary (HIGH confidence)
- [Capacitor Official Documentation](https://capacitorjs.com/docs) - Configuration, plugins, platform guides
- [Capacitor Config Reference](https://capacitorjs.com/docs/config) - server.url configuration details
- [Next.js Static Exports Guide](https://nextjs.org/docs/app/guides/static-exports) - Static export limitations

### Secondary (MEDIUM confidence)
- [Capgo - Next.js + Capacitor Guide](https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/) - Step-by-step integration
- [Capacitor GitHub Discussion #4080](https://github.com/ionic-team/capacitor/discussions/4080) - server.url in production experiences
- [Capacitor GitHub Discussion #4233](https://github.com/ionic-team/capacitor/discussions/4233) - Socket.IO integration solutions
- [Capgo GitHub Actions Guide](https://capgo.app/blog/automatic-capacitor-ios-build-github-action/) - CI/CD setup

### Tertiary (LOW confidence)
- Various Medium articles on Capacitor + Next.js integration
- Ionic Forum discussions on Socket.IO and WebSocket issues
- Stack Overflow for edge case troubleshooting

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Capacitor documentation is comprehensive
- Architecture (WebView approach): MEDIUM - server.url in production is documented but not officially recommended; community evidence supports it
- Socket.IO compatibility: MEDIUM - Solutions verified in GitHub discussions but require specific configuration
- Pitfalls: MEDIUM - Based on GitHub issues and forum reports, may have edge cases

**Research date:** 2026-01-26
**Valid until:** 30 days (Capacitor ecosystem is stable, major versions infrequent)

## Critical Decision Points for Planning

### Approach Selection

**WebView Approach (RECOMMENDED):**
- Pros: Zero code changes to webapp, instant updates via server, all features work
- Cons: Requires network connection, first load slightly slower
- Effort: 1-2 days to set up, minimal ongoing maintenance

**Static Export Approach (NOT RECOMMENDED for this project):**
- Pros: Works offline, faster cold start
- Cons: Requires removing SSR, Server Components, API routes; major refactoring
- Effort: 2-4 weeks of refactoring, ongoing dual maintenance

### Minimum Viable Integration

1. Install Capacitor packages
2. Configure capacitor.config.ts with server.url pointing to production
3. Add iOS and Android platforms
4. Configure splash screens and app icons
5. Set up safe area handling
6. Test Socket.IO connections
7. Build and deploy to TestFlight/Play Store beta

### Native Features Worth Adding

For a word game, these native features add value:
- **Haptics:** Feedback on correct/incorrect answers
- **Share:** Share scores and invite friends
- **App Lifecycle:** Pause game on background
- **Splash Screen:** Branded loading experience
- **Safe Areas:** Proper display on all devices

### Features NOT Needed

Skip these unless specifically requested:
- Camera (not used in word game)
- Geolocation (not used)
- Push Notifications (could add later)
- In-App Purchases (could add later)
- File System access (not needed)
