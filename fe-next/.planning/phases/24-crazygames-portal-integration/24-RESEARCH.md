# Phase 24: CrazyGames Portal Integration - Research

**Researched:** 2026-01-26
**Domain:** CrazyGames SDK integration, bundle optimization, game portal compliance
**Confidence:** HIGH

## Summary

CrazyGames is a major web game portal requiring SDK integration for full monetization and visibility. The integration involves loading the CrazyGames SDK (v2/v3 HTML5), implementing lifecycle events (gameplay start/stop, loading events), handling user authentication via their SDK instead of external OAuth providers, and implementing multiplayer invite functionality.

The current LexiClash build has a **critical size issue**: the public assets folder is 131MB total, with music alone at 57MB. The CrazyGames requirement is initial download size <=50MB (<=20MB for mobile homepage eligibility). This requires aggressive lazy loading of audio and potentially image assets.

The project already has partial CrazyGames configuration in `next.config.mjs` with CSP headers allowing CrazyGames domains. The `NEXT_PUBLIC_CRAZYGAMES_ENABLED` environment variable controls SDK script loading.

**Primary recommendation:** Implement progressive asset loading with core assets under 20MB for mobile eligibility, integrate CrazyGames SDK v2 with all required lifecycle events, and create a CrazyGames-specific auth adapter that hides Supabase OAuth and uses CrazyGames user module.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CrazyGames SDK v2 | Latest | Game portal integration | Official SDK, required for monetization |
| next/dynamic | Built-in | Lazy load heavy components | Next.js standard for code splitting |
| @next/bundle-analyzer | 15.5.9+ | Bundle size analysis | Already installed, verify sizes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Howler.js (existing) | 2.2.4 | Audio with lazy loading | Already used, supports preload:false |
| qrcode.react (existing) | 4.2.0 | QR code generation | Show QR for invite links |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SDK v2 | SDK v3 | v3 requires explicit init(), v2 auto-initializes. Use v2 for simpler integration |
| Custom audio lazy loader | Howler preload options | Howler already handles this with preload:'none' |

**Installation:**
```bash
# No npm install needed - SDK is loaded via script tag
# Add to HTML head when NEXT_PUBLIC_CRAZYGAMES_ENABLED=true:
# <script src="https://sdk.crazygames.com/crazygames-sdk-v2.js"></script>
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── crazygames/
│   ├── sdk.ts              # SDK wrapper with environment detection
│   ├── auth.ts             # CrazyGames auth adapter
│   ├── events.ts           # Gameplay/loading event helpers
│   ├── multiplayer.ts      # Invite link/button helpers
│   └── ads.ts              # Video/banner ad integration
hooks/
├── useCrazyGamesAuth.ts    # Auth hook for CrazyGames users
├── useCrazyGamesEvents.ts  # Gameplay lifecycle events
└── useCrazyGamesInvite.ts  # Invite button/link management
```

### Pattern 1: SDK Initialization Wrapper
**What:** Type-safe wrapper around window.CrazyGames.SDK with environment detection
**When to use:** All SDK calls should go through this wrapper
**Example:**
```typescript
// Source: https://docs.crazygames.com/sdk/html5-v2/intro/
type SDKEnvironment = 'local' | 'crazygames' | 'disabled';

interface CrazyGamesSDK {
  ad: {
    requestAd: (type: 'midgame' | 'rewarded', callbacks: AdCallbacks) => void;
    hasAdblock: () => Promise<boolean>;
  };
  game: {
    gameplayStart: () => void;
    gameplayStop: () => void;
    sdkGameLoadingStart: () => void;
    sdkGameLoadingStop: () => void;
    inviteLink: (params: Record<string, string>) => Promise<string>;
    showInviteButton: (params: Record<string, string>) => string;
    hideInviteButton: () => void;
    getInviteParam: (key: string) => Promise<string | null>;
    happytime: () => void;
  };
  user: {
    isUserAccountAvailable: () => Promise<boolean>;
    getUser: () => Promise<CrazyGamesUser | null>;
    getUserToken: () => Promise<string>;
    showAuthPrompt: () => Promise<CrazyGamesUser>;
    addAuthListener: (listener: (user: CrazyGamesUser | null) => void) => void;
    removeAuthListener: (listener: (user: CrazyGamesUser | null) => void) => void;
    getSystemInfo: () => Promise<SystemInfo>;
  };
  data: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  getEnvironment: () => Promise<SDKEnvironment>;
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK: CrazyGamesSDK;
    };
  }
}

export async function getCrazyGamesSDK(): Promise<CrazyGamesSDK | null> {
  if (typeof window === 'undefined') return null;
  if (!window.CrazyGames?.SDK) return null;

  const env = await window.CrazyGames.SDK.getEnvironment();
  if (env === 'disabled') return null;

  return window.CrazyGames.SDK;
}

export function isCrazyGamesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'true';
}
```

### Pattern 2: CrazyGames Auth Adapter
**What:** Bridge between CrazyGames user module and existing auth system
**When to use:** When running on CrazyGames platform, hide Supabase OAuth
**Example:**
```typescript
// Source: https://docs.crazygames.com/requirements/account-integration/
interface CrazyGamesUser {
  username: string;
  profilePictureUrl: string;
}

export async function getCrazyGamesUser(): Promise<CrazyGamesUser | null> {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return null;

  try {
    return await sdk.user.getUser();
  } catch (error) {
    console.error('CrazyGames getUser error:', error);
    return null;
  }
}

// Token for server-side verification
export async function getCrazyGamesToken(): Promise<string | null> {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return null;

  const user = await sdk.user.getUser();
  if (!user) return null;

  try {
    return await sdk.user.getUserToken();
  } catch (error) {
    console.error('CrazyGames getUserToken error:', error);
    return null;
  }
}

// Show login prompt (only when user explicitly requests login)
export async function showCrazyGamesLogin(): Promise<CrazyGamesUser | null> {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return null;

  try {
    return await sdk.user.showAuthPrompt();
  } catch (error) {
    // Handle: userCancelled, userAlreadySignedIn, showAuthPromptInProgress
    console.error('CrazyGames auth prompt error:', error);
    return null;
  }
}
```

### Pattern 3: Gameplay Event Lifecycle
**What:** Track gameplay start/stop for initial download size measurement
**When to use:** Wrap game session start/end with SDK events
**Example:**
```typescript
// Source: https://docs.crazygames.com/sdk/html5-v2/game/
export class GameplayTracker {
  private isPlaying = false;
  private sdk: CrazyGamesSDK | null = null;

  async init() {
    this.sdk = await getCrazyGamesSDK();
  }

  start() {
    if (this.isPlaying || !this.sdk) return;
    this.sdk.game.gameplayStart();
    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying || !this.sdk) return;
    this.sdk.game.gameplayStop();
    this.isPlaying = false;
  }

  // Call for major achievements (boss defeat, high score)
  celebrate() {
    if (!this.sdk) return;
    this.sdk.game.happytime();
  }
}
```

### Pattern 4: Progressive Asset Loading
**What:** Load only essential assets initially, lazy-load rest during gameplay
**When to use:** All audio, large images, adventure mode assets
**Example:**
```typescript
// Core assets loaded immediately (<20MB target)
const CORE_ASSETS = {
  sounds: ['word-accepted.wav', 'combo.wav'],
  music: [],  // No music in initial load
  images: ['logo.png', 'avatars/default.webp'],
};

// Lazy loaded on demand
const LAZY_ASSETS = {
  music: [
    'in_lobby.mp3',
    'in_game.mp3',
    'before_game.mp3',
  ],
  adventureMusic: [
    'adventure/1_level_1.mp3',
    'adventure/1_level_2.mp3',
    // ... all adventure music
  ],
  sounds: [
    'achievment.mp3',
    'earthquake-shake.wav',
    'fire-crackle-loop.wav',
  ],
};

// Use Howler.js with preload: false
function createLazyAudio(src: string): Howl {
  return new Howl({
    src: [src],
    preload: false,  // Don't load until play() called
    html5: true,     // Stream instead of full download
  });
}
```

### Anti-Patterns to Avoid
- **External OAuth Buttons**: CrazyGames prohibits Google/Discord/etc login buttons. Hide all OAuth UI when running on CrazyGames.
- **Preloading All Audio**: The 57MB music folder will exceed size limits. Use lazy loading exclusively.
- **Auto-triggering Login**: Never automatically show CrazyGames login prompt. Only show on explicit user action.
- **Ads During Gameplay**: Video ads only during natural breaks (level end, death, menu).
- **Blocking on Adblock**: Game must work normally even with adblockers. Can disable optional features only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invite link generation | Custom URL builder | SDK inviteLink() | CrazyGames handles parameters, notifications |
| QR code for invites | Custom QR with link | SDK showInviteButton() + qrcode.react for custom UI | SDK provides native popup, QR for custom display |
| User authentication | Custom CG token verification | SDK getUserToken() + their public key | JWT verification at https://sdk.crazygames.com/publicKey.json |
| Cloud save | Custom server storage | SDK data module | Automatic cross-device sync, localStorage fallback |
| Ad frequency limiting | Manual 3-minute timer | SDK automatic management | SDK handles all ad frequency rules |

**Key insight:** CrazyGames SDK handles edge cases like cross-device sync, ad frequency, invite notifications. Custom solutions would miss platform integration features.

## Common Pitfalls

### Pitfall 1: Initial Download Size Exceeds 50MB
**What goes wrong:** Game rejected or disabled on mobile due to large initial bundle
**Why it happens:** Music files (57MB), images (28MB), Three.js bundle included in initial load
**How to avoid:**
1. Set `preload: false` on all Howler sounds
2. Use `html5: true` for streaming audio
3. Lazy-load adventure mode assets
4. Split Three.js components with next/dynamic
**Warning signs:** Build analyzer shows large chunks, music files loaded before gameplay starts

### Pitfall 2: External Login Buttons Visible
**What goes wrong:** Game rejected for showing Google/Discord login options
**Why it happens:** Existing auth UI not hidden when running on CrazyGames
**How to avoid:**
1. Check `isCrazyGamesEnvironment()` before rendering OAuth buttons
2. Replace with CrazyGames login button that calls `showAuthPrompt()`
3. Keep guest play option prominently available
**Warning signs:** Auth modal renders OAuth buttons on CrazyGames domain

### Pitfall 3: Ads During Gameplay
**What goes wrong:** Game flagged for disruptive ads
**Why it happens:** Midgame ads triggered during active word submission
**How to avoid:**
1. Only request ads during: level end, round end, menu screens
2. Use `gameplayStop()` before any ad request
3. Mute game audio via `adStarted` callback
**Warning signs:** Ad requests without prior `gameplayStop()` call

### Pitfall 4: Blocking Gameplay for Adblock Users
**What goes wrong:** Game becomes unplayable for users with adblockers
**Why it happens:** Core features gated behind ad completion
**How to avoid:**
1. Check `hasAdblock()` on init
2. Disable only optional features (extra lives, bonus rewards)
3. Show friendly message encouraging adblock disable
**Warning signs:** Game state blocked waiting for ad completion

### Pitfall 5: Missing Invite Button Cleanup
**What goes wrong:** Invite button visible when room is full or game started
**Why it happens:** `hideInviteButton()` not called on state change
**How to avoid:**
1. Call `hideInviteButton()` when room fills
2. Call `hideInviteButton()` when game round starts
3. Call `hideInviteButton()` when lobby is cancelled
**Warning signs:** Invite popup shows for full/in-progress games

### Pitfall 6: Portrait Mode Issues
**What goes wrong:** Game layout broken in portrait orientation
**Why it happens:** CSS assumes landscape orientation
**How to avoid:**
1. Use container queries for responsive layouts
2. Test with CrazyGames portal rotation
3. Show orientation prompt for portrait devices
**Warning signs:** UI elements overlap or get cut off in portrait

## Code Examples

### SDK Script Loading
```typescript
// Source: https://docs.crazygames.com/sdk/html5-v2/intro/
// In app/layout.tsx or _document.tsx

import Script from 'next/script';

export default function RootLayout({ children }) {
  const isCrazyGames = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'true';

  return (
    <html>
      <head>
        {isCrazyGames && (
          <Script
            src="https://sdk.crazygames.com/crazygames-sdk-v2.js"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Environment Detection
```typescript
// Source: https://docs.crazygames.com/sdk/html5-v2/intro/
export async function detectCrazyGamesEnvironment(): Promise<{
  isEnabled: boolean;
  environment: 'local' | 'crazygames' | 'disabled' | 'not-loaded';
}> {
  if (typeof window === 'undefined') {
    return { isEnabled: false, environment: 'not-loaded' };
  }

  if (!window.CrazyGames?.SDK) {
    return { isEnabled: false, environment: 'not-loaded' };
  }

  const env = await window.CrazyGames.SDK.getEnvironment();
  return {
    isEnabled: env === 'crazygames' || env === 'local',
    environment: env,
  };
}
```

### Multiplayer Invite Integration
```typescript
// Source: https://docs.crazygames.com/sdk/html5-v2/game/
export async function setupMultiplayerInvite(roomCode: string) {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return null;

  // Show invite button in CrazyGames footer
  const link = sdk.game.showInviteButton({
    roomId: roomCode,
  });

  return link;
}

export async function cleanupMultiplayerInvite() {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return;

  sdk.game.hideInviteButton();
}

export async function getInviteRoomCode(): Promise<string | null> {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return null;

  return sdk.game.getInviteParam('roomId');
}

// Check if launched via instant multiplayer
export async function isInstantMultiplayer(): Promise<boolean> {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return false;

  return sdk.game.isInstantMultiplayer ?? false;
}
```

### Audio Muting for Ads
```typescript
// Source: https://docs.crazygames.com/requirements/ads/
import { Howler } from 'howler';

export async function requestMidgameAd(): Promise<boolean> {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return false;

  return new Promise((resolve) => {
    // Stop gameplay tracking
    sdk.game.gameplayStop();

    sdk.ad.requestAd('midgame', {
      adStarted: () => {
        // Mute all game audio
        Howler.mute(true);
      },
      adFinished: () => {
        Howler.mute(false);
        sdk.game.gameplayStart();
        resolve(true);
      },
      adError: (error, errorData) => {
        Howler.mute(false);
        sdk.game.gameplayStart();
        console.log('Ad error:', errorData?.reason, errorData?.message);
        resolve(false);
      },
    });
  });
}
```

### Game Settings Listener
```typescript
// Source: https://docs.crazygames.com/sdk/html5-v2/game/
import { Howler } from 'howler';

export async function setupGameSettingsListener() {
  const sdk = await getCrazyGamesSDK();
  if (!sdk) return;

  // Check initial settings
  const settings = sdk.game.settings;
  if (settings.muteAudio) {
    Howler.mute(true);
  }

  // Listen for changes
  sdk.game.onSettingsChange((newSettings) => {
    if (newSettings.muteAudio !== undefined) {
      Howler.mute(newSettings.muteAudio);
    }
    if (newSettings.disableChat !== undefined) {
      // Handle chat disable for multiplayer games
      setChatEnabled(!newSettings.disableChat);
    }
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SDK v1 manual init | SDK v2 auto-init | 2024 | Simpler integration, no init() call needed |
| `sdkGameLoadingStart()` | `loadingStart()` (v3) | 2025 | Cleaner method names in v3 |
| Callback-only API | Promise + callback support | SDK v2 | Can use async/await for cleaner code |
| X-Frame-Options | frame-ancestors CSP | Modern | Already done in next.config.mjs |

**Deprecated/outdated:**
- SDK v1: No longer maintained, use v2 or v3
- `isInstantJoin`: Replaced by `isInstantMultiplayer`
- Global event listeners: v2 uses callback parameters instead

## Open Questions

1. **Instant Multiplayer Flow**
   - What we know: `isInstantMultiplayer` flag indicates direct multiplayer launch
   - What's unclear: Exact expected UX - should it skip lobby entirely or show brief config?
   - Recommendation: Default to creating private room with standard settings, allow optional config

2. **Data Module vs Supabase**
   - What we know: CrazyGames data module syncs across devices for CG users
   - What's unclear: How to handle users who are logged into both CG and Supabase
   - Recommendation: Use CG data module for CG platform, Supabase for direct access

3. **Mobile Homepage Eligibility**
   - What we know: Need <=20MB for mobile homepage placement
   - What's unclear: Current actual initial load size (need to measure)
   - Recommendation: Run bundle analyzer, target <15MB with aggressive lazy loading

## Sources

### Primary (HIGH confidence)
- [CrazyGames SDK v2 Documentation](https://docs.crazygames.com/sdk/html5-v2/intro/) - SDK setup, initialization
- [CrazyGames Technical Requirements](https://docs.crazygames.com/requirements/technical/) - Size limits, browser support
- [CrazyGames Game Module](https://docs.crazygames.com/sdk/html5-v2/game/) - Lifecycle events, multiplayer
- [CrazyGames User Module](https://docs.crazygames.com/sdk/html5-v2/user/) - Authentication, tokens
- [CrazyGames Account Integration](https://docs.crazygames.com/requirements/account-integration/) - External login restrictions
- [CrazyGames Advertisement Requirements](https://docs.crazygames.com/requirements/ads/) - Ad timing, restrictions
- [CrazyGames Multiplayer Requirements](https://docs.crazygames.com/requirements/multiplayer/) - Invite system, instant multiplayer

### Secondary (MEDIUM confidence)
- [Next.js Bundle Optimization](https://nextjs.org/docs/app/guides/package-bundling) - Code splitting strategies
- Project analysis: Current public folder is 131MB total (music: 57MB, images: 28MB)
- Project analysis: next.config.mjs already has CrazyGames CSP configuration

### Tertiary (LOW confidence)
- Initial download measurement: Need to verify actual first-load size via DevTools/bundle analyzer

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK docs are comprehensive
- Architecture: HIGH - Clear patterns from SDK docs
- Pitfalls: HIGH - Requirements docs explicitly list restrictions

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - SDK is stable)
