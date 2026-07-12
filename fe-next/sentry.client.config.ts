import * as Sentry from "@sentry/nextjs";
import { WASM_STREAMING_COMPILE_FAILED, isStaleAssetLinkRejection } from "@/lib/sentry/benignErrorPatterns";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

const isProduction = process.env.NODE_ENV === "production";
const environment = process.env.NODE_ENV || "development";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: isProduction,
  environment,

  sampleRate: 1.0,
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  beforeSend(event, hint) {
    // Drop HeadlessChrome events — crawlers/CI bots, not real users.
    // Catches rAF push-on-undefined errors (JAVASCRIPT-NEXTJS-121) triggered
    // during physics/overlay teardown that only fires under automation.
    if (event.contexts?.browser?.name === "HeadlessChrome") {
      return null;
    }

    if (typeof window !== "undefined") {
      const LogRocket = (window as unknown as { LogRocket?: { sessionURL?: string } }).LogRocket;
      if (LogRocket?.sessionURL) {
        event.extra = event.extra || {};
        event.extra.logRocketSessionURL = LogRocket.sessionURL;
      }
    }

    // Filter out non-critical analytics API errors
    // These are already handled gracefully with timeouts and error catching
    const requestUrl = event.request?.url || event.contexts?.trace?.data?.url;
    if (requestUrl && typeof requestUrl === 'string' && requestUrl.includes('/api/analytics/guest-session')) {
      return null;
    }

    const error = hint.originalException;
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("non-error promise rejection captured") ||
        errorMessage.includes("chunk load failed") ||
        errorMessage.includes("loading chunk") ||
        errorMessage.includes("loading css chunk")
      ) {
        return null;
      }
    }

    // Non-Error promise rejections (CrazyGames SDK throws plain objects).
    // Handled by CrazyGamesSDK.showAuthPrompt try/catch — drop residual noise (JAVASCRIPT-NEXTJS-129).
    // Also covers AdMob/CrazyGames basic-launch ad-gating codes which surface as
    // <unknown> events because ignoreErrors regex can't see nested object props
    // (JAVASCRIPT-NEXTJS-12J).
    if (error && typeof error === "object" && !(error instanceof Error)) {
      const code = (error as { code?: string }).code;
      if (
        code === "userAlreadySignedIn" ||
        code === "userNotAuthenticated" ||
        code === "bannersDisabledBasicLaunch" ||
        code === "adsDisabledBasicLaunch"
      ) {
        return null;
      }
    }

    // Next.js internal <link>/<script> prefetch rejects with a raw DOM Event —
    // surfaces as `<unknown>` (JAVASCRIPT-NEXTJS-1R3). Recovery already handled
    // by ChunkErrorRecovery's synchronous error listener; drop the duplicate noise.
    if (isStaleAssetLinkRejection(error)) {
      return null;
    }

    return event;
  },

  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Failed to fetch",
    "NetworkError",
    "Network request failed",
    "Load failed",
    "AbortError",
    "Aborted",
    "Script error",
    "Non-Error promise rejection captured",
    "ChunkLoadError",
    "Loading chunk",
    "Loading CSS chunk",
    "Failed to load chunk",
    "dynamically imported module",
    /from module \d+/i,
    /^Uncaught \(in promise\)/,
    /^Unhandled \(rejection\)/,
    // Howler.js audio pool exhaustion - expected on mobile devices with many sounds
    // Fixed by increasing pool size in howlerConfig.ts, but can still occur on low-memory devices
    "HTML5 Audio pool exhausted",
    /html5 audio pool exhausted/i,
    /pool exhausted.*returning potentially locked audio/i,
    // Recharts library warning - non-actionable, occurs during initial render
    // before container dimensions stabilize. Chart renders correctly after delay.
    /width\(-?\d+\) and height\(-?\d+\) of chart should be greater than 0/i,
    // Auth session timeout warning - expected behavior on slow mobile connections
    // The app continues without blocking, handles gracefully with 5s timeout
    "Auth session fetch timed out",
    /auth session fetch timed out/i,
    // Socket.IO connection warnings - transient network errors with auto-retry
    "[SOCKET.IO] Connection error",
    /\[socket\.io\].*connection error/i,
    // Socket.IO expected business logic errors (GAME_NOT_FOUND, NOT_IN_GAME, ROOM_NOT_FOUND)
    // These are handled gracefully in SocketContext.tsx and are not bugs
    "[SOCKET.IO] Expected error",
    /\[socket\.io\].*expected error/i,
    // WebSocket/Socket.IO connection closed - transient network errors
    // These are expected when users close tabs, lose network, or switch pages
    "Connection closed",
    /connection closed/i,
    // Avatar color validation error - client sends invalid hex, server rejects (expected)
    "avatar.color: Invalid string",
    /avatar\.color.*must match pattern/i,
    // Word Hunt storage validation - skipping corrupt localStorage data (expected filtering)
    "[Storage] Skipping invalid result",
    /\[storage\].*skipping invalid.*attemptsUsed.*0/i,
    "[Storage] Invalid attemptsUsed",
    /\[storage\].*invalid attemptsUsed/i,
    // Room name validation - server correctly rejects invalid characters
    "roomName: Room name can only contain",
    /roomName.*can only contain/i,
    // Auth context errors - should not occur with proper provider setup (historical)
    "useAuth must be used within an AuthProvider",
    /useAuth must be used within.*provider/i,
    // AI hint generation failures - handled gracefully with fallback hints
    // These occur when Vertex AI returns error pages or rate limits
    "[API] AI hint generation failed",
    /\[api\].*ai hint generation failed/i,
    /unexpected token.*<!doctype/i,
    // Remotion license notification - informational only, not an error
    // Shows for open-source usage of Remotion Player component
    /remotion.*license/i,
    /acknowledgeRemotionLicense/i,
    // DDA Analytics timeouts - non-blocking, handled gracefully with fallback
    // Analytics failures don't affect gameplay (see lib/aiDirector/analyticsLogger.ts:109)
    /\[DDA Analytics\].*failed to log event/i,
    /\[DDA Analytics\].*408/i,
    // Notifications subscription timeouts - handled with automatic retry
    // See lib/supabaseRealtimeNotifications.ts:89 for retry logic
    /notifications channel subscription timed out/i,
    // JSON-LD @context TypeError from browser extensions (SEO analyzers, schema validators)
    // Not first-party code - no application code calls .toLowerCase() on @context
    /\["@context"\]\.toLowerCase/i,
    // OAuth access_denied — user cancelled consent screen, not a bug
    /OAuth provider returned error.*access_denied/i,
    // Realtime connection retries — expected transient behavior with auto-recovery
    /\[Realtime\].*connection failed.*retrying/i,
    // Progression duplicate/retry — handled gracefully with dedup guards
    /\[ProgressionContext\].*Skipping duplicate/i,
    // Progression 429 after retry — rate limited by Supabase, retried once, then logged
    /\[ProgressionContext\].*Record attempt failed/i,
    // Moderation approve/reject timeouts — handled gracefully with AbortController
    /Moderation (approve|reject) failed/i,
    // Solve-grid blacklist Supabase 502 — returns unfiltered words as fallback
    /\[SOLVE-GRID\].*Blacklist query error/i,
    // Friends fetch fails downstream of Supabase lock contention — non-actionable
    /Error fetching friends/i,
    // Next.js router state header parse — transient internal error, not actionable
    /router state header was sent but could not be parsed/i,
    // Progression quest-progress 429 — rate limited, non-critical background save
    /\[ProgressionContext\].*quest-progress failed.*429/i,
    // Expected game behavior — Word Hunt elimination, host kicking, game lifecycle
    "You have been eliminated",
    "You have been kicked from this room",
    "Game is not in progress",
    "Game not found",
    // Matter.js delta warning — physics engine perf hint, not a bug (JAVASCRIPT-NEXTJS-Y1)
    /Matter\.Engine\.update.*delta argument/i,
    // CrazyGames SDK errors — expected when not running on CrazyGames platform (JAVASCRIPT-NEXTJS-XV)
    /CrazySDK is not initialized/i,
    /Failed to check adblock/i,
    /Error checking CrazyGames user/i,
    /Failed to load CrazyGames friends/i,
    // Bots hitting routes with invalid locale params — not a bug
    /Incorrect locale information provided/i,
    /RangeError.*invalid language tag/i,
    /Invalid language tag/i,
    // Clipboard writeText when document not focused — browser restriction, not a bug
    /Document is not focused/i,
    /Failed to execute 'writeText' on 'Clipboard'/i,
    // navigator.sendBeacon unavailable in bot/SSR contexts — handled with fetch fallback
    /navigator\.sendBeacon is not a function/i,
    // Socket.IO expected race conditions — player left game or word already found
    /\[SOCKET\.IO\] Socket error event.*Not in a game/i,
    /\[SOCKET\.IO\] Socket error event.*not in a game/i,
    /\[SOCKET\.IO\] Socket error event.*Target word already found/i,
    // NativeOAuth UNIMPLEMENTED — CrazyGames SDK outside platform
    /\[NativeOAuth\].*UNIMPLEMENTED/i,
    // AdMob plugin not registered (web/blog/non-native WebView contexts).
    // Initialize/showBanner/hideBanner all surface as UNIMPLEMENTED — guarded by
    // Capacitor.isPluginAvailable('AdMob') in AdMobContext but plugin probe still
    // emits warns under captureConsole. (JAVASCRIPT-NEXTJS-123, 125)
    /\[AdMob\].*(initialize|showBanner|hideBanner) failed/i,
    /AdMob.*UNIMPLEMENTED/i,
    // Capacitor App plugin race during native bridge init or stale APK install
    // (versionCode 3766 lacks plugin guards; 3959 fixed). All call sites guarded
    // with isPluginAvailable('App') (Sentry JAVASCRIPT-NEXTJS-12A).
    /"App" plugin is not implemented/i,
    /plugin is not implemented on (android|ios)/i,
    // CrazyGames SDK ad/banner/gameplay warnings — expected outside platform
    /adsDisabledBasicLaunch/i,
    /bannersDisabledBasicLaunch/i,
    /gameplayStop\(\) call throttled/i,
    // Failed to retrieve friends list — CrazyGames SDK error
    /Failed to retrieve friends list/i,
    // Error setting up push listeners — CrazyGames SDK
    /Error setting up push listeners/i,
    // Leaderboard connection failures — transient, auto-retries
    /Leaderboard connection failed after max retries/i,
    // Supabase insert error for player words — race condition on duplicate submit
    /Error inserting player word/i,
    // Word Hunt leaderboard count errors — transient API failures
    /Word Hunt leaderboard count error/i,
    // ChunkError auto-refresh skip — expected after deployment
    /\[ChunkError\] Skipping auto-refresh/i,
    // DOM parentNode null — transient React unmount race condition
    /Cannot read property 'parentNode' of null/i,
    /Cannot read properties of null.*parentNode/i,
    // PixiJS WebGL errors on low-end Android devices — not actionable
    /Cannot read properties of null.*alphaMode/i,
    /Unable to convert color/i,
    // PixiJS wasm fallback chain on word-wheel — streaming compile rejected
    // (MIME quirk, non-200 asset, etc.); ArrayBuffer path succeeds, page renders
    // fine (JAVASCRIPT-NEXTJS-14J/14K/14M/14N)
    WASM_STREAMING_COMPILE_FAILED,
    /failed to asynchronously prepare wasm/i,
    /falling back to ArrayBuffer instantiation/i,
    // Blast mode access rejection — expected for non-admin users trying blast
    /Blast mode requires special access/i,
    // DissolveEffect texture race — PixiJS texture not ready during effect init
    /DissolveEffect.*Could not find valid resource/i,
    // Bot achievement calculation with missing data — non-critical
    /missing word details during achievement/i,
    // React error #185 — infinite loop already fixed in selectors.ts, residual edge case
    /Maximum update depth exceeded/i,
    // Ghost rival missing data — expected when no matching rival exists
    /\[ghostRival\].*No rival found/i,
    // Word submission game state — player submits after game ends, handled gracefully
    /Word submission rejected.*game state/i,
    // Supabase deadlock — auto-retried successfully, not actionable
    /Deadlock on profile stats update/i,
    // HintGenerator timeout — AI service occasionally slow, handled with fallback
    /\[HintGenerator\].*timed out/i,
    // Supabase auth lock — React Strict Mode double mount, auto-recovers
    /Lock.*was not released within/i,
    // Supabase auth lock stolen — concurrent getSession/getUser race, auto-recovers (JAVASCRIPT-NEXTJS-147)
    /Lock was stolen by another request/i,
    /\[AuthButton\] Error checking reward/i,
    // Multiplayer add-bots-during-game guard — legit server reject when game in progress (JAVASCRIPT-NEXTJS-141, 149)
    /Cannot add bots during a game/i,
    // NativeOAuth Google sign-in — device-specific config issues
    /\[NativeOAuth\].*Google sign-in error/i,
    /\[useOAuthSignIn\].*Native OAuth failed/i,
    // CrazyGames userNotAuthenticated — expected when user not logged in
    /userNotAuthenticated/i,
    // CrazyGames userAlreadySignedIn — handled by showAuthPrompt try/catch (JAVASCRIPT-NEXTJS-128)
    /userAlreadySignedIn/i,
    /\[UserError\] Code: userAlreadySignedIn/i,
    // Push token registration network failures — transient, downgraded to debug (JAVASCRIPT-NEXTJS-12C)
    /Error registering push token/i,
    /Push token (network|server) (error|rejected)/i,
    // Supabase refresh-token-not-found — expected on session expiry; handled by
    // isRefreshTokenError() → clearAuthState() at all call sites (JAVASCRIPT-NEXTJS-12D)
    /Invalid Refresh Token.*Refresh Token Not Found/i,
    /AuthApiError.*refresh token not found/i,
    /refresh_token_not_found/i,
    // CrazyGames friends refresh — downstream of auth issues
    /Failed to refresh CrazyGames friends/i,
    // PWA service worker registration — transient, non-critical
    /\[PWA\].*Service worker registration failed/i,
    // Error subscribing to notifications channel — transient Supabase realtime
    /Error subscribing to notifications channel/i,
    // Socket.IO eliminated/kicked — expected gameplay events
    /\[SOCKET\.IO\].*Error received.*eliminated/i,
    /\[SOCKET\.IO\].*Error received.*kicked/i,
    /\[SOCKET\.IO\].*Error received.*Target word already found/i,
    // Socket.IO AUTH_REQUIRED — unauth users hitting friends sockets; server rejects correctly (JAVASCRIPT-NEXTJS-12G)
    /\[SOCKET\.IO\].*AUTH_REQUIRED/i,
    /\[SOCKET\.IO\].*Authentication required/i,
    // Multiplayer join 10s safety timeout — transient connectivity, user is shown toast (JAVASCRIPT-NEXTJS-12E)
    /\[JOIN\] Safety timeout triggered/i,
    // Results/resetGame timeout — race condition during fast rematch
    /\[RESULTS\].*resetGame callback timed out/i,
    // Adventure state 404 — new user without saved progress
    /\[ProgressionContext\].*adventure\/state returned 404/i,
    // AI validateWord failures — retries handled, words rejected gracefully
    /\[AI_SERVICE\] validateWord.*failed after/i,
    /\[AI_SERVICE\] validateWord.*attempt.*failed.*retrying/i,
    // gameplayStart throttled — CrazyGames SDK rate limiting
    /gameplayStart\(\) call throttled/i,
    // "omg" — user feedback captured as error, not actionable
    /^omg$/i,
    // ErrorBoundary caught — already handled by error boundary UI
    /ErrorBoundary caught an error/i,
    // Results error — minified React error in results screen
    /\[Results\] Error/i,
    // Target word already found — race condition on simultaneous submit
    /Target word already found/i,
    // Page error React #185 — minified React error, covered by max update depth
    /Page error.*Minified React error/i,
    // CanvasGradient addColorStop — malformed color string, fixed in ComboPulseRing
    /addColorStop.*could not be parsed as a color/i,
    // PixiJS sprite lifecycle race — animation rAF fires after sprite destroyed on unmount
    /Cannot set properties of null \(setting '(x|y|width|height|alpha|scale|rotation)'\)/i,
    // Supabase auth lock stolen — concurrent requests race for navigator lock (JAVASCRIPT-NEXTJS-10W)
    /Lock.*was released because another request stole it/i,
    /Lock broken by another request with the 'steal' option/i,
    // Safari WebView messageHandlers — not our code (JAVASCRIPT-NEXTJS-119, 118)
    /window\.webkit\.messageHandlers/i,
    // HTML5 SDK requestInProgress — third-party SDK console log (JAVASCRIPT-NEXTJS-117)
    /requestInProgress/i,
    // shadowroot/route-announcer — browser extension noise (JAVASCRIPT-NEXTJS-116)
    /shadowroot.*NEXT-ROUTE-ANNOUNCER/i,
    /no txrsid/i,
    // console.warn(stack) from React internals — no message, just stack frames (JAVASCRIPT-NEXTJS-11C)
    /^\s*at https?:\/\/[^\s]+\/_next\/static\/chunks\//,
    // LogRocket internal quota/memory warnings — third-party, non-actionable (JAVASCRIPT-NEXTJS-11T, 11Y, 15K)
    /LogRocket.*filter manager.*too much memory/i,
    /LogRocket.*Session quota exceeded/i,
    /LogRocket.*Navigation rate limit/i,
    /LogRocket is using too much memory/i,
    /Navigation rate limit exceeded/i,
    // LogRocket mirror-metadata timeout on rapid style changes — third-party
    // replay-recording internals, doesn't affect the app (JAVASCRIPT-NEXTJS-1KG)
    /LogRocket.*Timed out waiting for mirror metadata/i,
    // Coin sync rate-limits — policy, not bug. Downgraded at source but defense in depth (JAVASCRIPT-NEXTJS-15F, 15G)
    /\[CoinContext\] Failed to add coins:.*TOO_MANY_REQUESTS/i,
    /Coin sync API error:.*TOO_MANY_REQUESTS/i,
    // Pixi v8 destroy before init — fixed at source in BlastFxOverlay; defense in depth (JAVASCRIPT-NEXTJS-15E)
    /this\._cancelResize is not a function/i,
    // Third-party SDK chunk (`core.js:297`, fn `Tx`) — Supabase realtime broadcast
    // events with no payload. Not first-party; no .payload access in app code.
    /Cannot read properties of undefined \(reading 'payload'\)/i,
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
    /webkit-masked-url/i,
    /^resource:\/\//i,
  ],

  integrations: [
    Sentry.browserTracingIntegration({
      enableInp: true,
      enableLongTask: true,
    }),
  ],

  initialScope: {
    tags: {
      runtime: "browser",
    },
  },
});
