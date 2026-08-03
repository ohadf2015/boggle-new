// Sentry SDK is loaded lazily via loadSentry() — never statically imported
// here (this module sits in the client boot path; see utils/sentryLazy.ts).
import { loadSentry } from "./sentryLazy";

interface ProfileData {
  username?: string;
  is_admin?: boolean;
  total_games?: number;
  country_code?: string | null;
}

// ============================================================================
// Error Context Interfaces
// ============================================================================

interface ApiErrorContext {
  method?: string;
  userId?: string;
  statusCode?: number;
  body?: Record<string, unknown>;
}

interface SocketErrorContext {
  event: string;
  gameCode?: string;
  socketId?: string;
  username?: string;
  isHost?: boolean;
}

interface AIServiceErrorContext {
  operation: string;
  word?: string;
  language?: string;
  retryAttempt?: number;
  isRateLimited?: boolean;
}

interface BackgroundErrorContext {
  operation: string;
  service?: string;
  userId?: string;
  isRetryable?: boolean;
}

/**
 * Set user context in Sentry when user authenticates
 */
export function setSentryUser(
  user: { id: string } | null,
  profile: ProfileData | null
): void {
  if (process.env.NODE_ENV !== "production") return;

  if (user && profile) {
    void loadSentry().then((Sentry) => {
      Sentry.setUser({
        id: user.id,
        username: profile.username,
      });

      // Set additional context
      Sentry.setContext("profile", {
        isAdmin: profile.is_admin || false,
        totalGames: profile.total_games || 0,
        countryCode: profile.country_code || null,
      });
    });
  } else {
    void loadSentry().then((Sentry) => Sentry.setUser(null));
  }
}

/**
 * Clear user context on logout
 */
export function clearSentryUser(): void {
  void loadSentry().then((Sentry) => Sentry.setUser(null));
}

/**
 * Capture an error with additional context
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV !== "production") {
    console.error("[Sentry would capture]:", error, context);
    return;
  }

  void loadSentry().then((Sentry) => {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext("additional", context);
      }
      Sentry.captureException(error);
    });
  });

  forwardToPostHog(
    error,
    context ?? {},
    typeof context?.userId === "string" ? context.userId : undefined
  );
}

/**
 * Set game context for better error grouping
 */
export function setGameContext(
  gameCode: string | null,
  language?: string
): void {
  if (gameCode) {
    void loadSentry().then((Sentry) => {
      Sentry.setTag("game_code", gameCode);
      if (language) {
        Sentry.setTag("game_language", language);
      }
    });
  } else {
    void loadSentry().then((Sentry) => {
      Sentry.setTag("game_code", undefined);
      Sentry.setTag("game_language", undefined);
    });
  }
}

/**
 * Link LogRocket session URL to current Sentry scope
 * Call this after LogRocket initializes
 */
export function linkLogRocketSession(): void {
  if (typeof window === "undefined") return;

  const LogRocket = (
    window as unknown as {
      LogRocket?: { getSessionURL?: (cb: (url: string) => void) => void };
    }
  ).LogRocket;

  if (LogRocket?.getSessionURL) {
    LogRocket.getSessionURL((sessionURL: string) => {
      void loadSentry().then((Sentry) => {
        Sentry.setContext("logrocket", {
          sessionURL,
        });
        Sentry.setTag("logrocket_session", sessionURL);
      });
    });
  }
}

// ============================================================================
// Expected Error Detection
// ============================================================================

/**
 * Patterns for errors that are expected and should NOT be captured to Sentry
 */
const EXPECTED_ERROR_PATTERNS = [
  // Audio autoplay blocks (common on mobile/strict browsers)
  /NotAllowedError/i,
  /play\(\) failed/i,
  /autoplay/i,
  /user denied permission/i,
  /Playback was unable to start/i,
  /Failed to start the audio device/i,
  /audio device/i,
  /InvalidStateError/i,

  // Audio loading/decoding issues (expected on some devices)
  /HTML5 Audio pool exhausted/i,
  /pool exhausted/i,
  /Decoding audio data failed/i,
  /audio.*decoding/i,
  /Failed to load.*audio/i,
  /Failed to play.*audio/i,
  /onloaderror/i,
  /onplayerror/i,

  // Rate limiting (handled gracefully by UI)
  /rate limit/i,
  /too many requests/i,
  /429/,

  // Multiplayer race conditions (mutex guards working as designed)
  /Game is already starting/i,
  /Invalid start game request/i,
  /duplicate startGame/i,
  /Cannot add bots during a game/i,

  // Supabase auth token lock contention (expected under concurrent requests)
  /Lock .* was released because another request stole it/i,
  /Lock broken by another request with the 'steal' option/i,
  /Lock was stolen by another request/i,

  // Auth loading timeout (safety guard, not a bug)
  /Auth loading timeout/i,

  // Network timeouts for non-critical operations
  /AbortError/i,
  /timeout/i,
  /network request failed/i,

  // User input validation (expected user errors)
  /invalid referral code/i,
  /username taken/i,
  /room not found/i,
  /game not found/i,
  /game code already/i,
  /already in use/i,
  /already referred/i,
  /cannot refer yourself/i,
  /not in progress/i,
  /not in a game/i,
  /not a word-hunt game/i,
  /already in progress/i,
  /target word already found/i,
  /you have been eliminated/i,
  /you have been kicked/i,

  // Socket reconnection (normal lifecycle)
  /transport close/i,
  /ping timeout/i,
  /websocket error/i,
  /connect_error/i,
  /polling error/i,
  /socket not connected/i,
  /Cannot join/i,
  /cannot emit/i,

  // Transient server errors (player should retry)
  /An error occurred while processing your word/i,
];

/**
 * Check if an error is expected (should NOT be captured to Sentry)
 */
export function isExpectedError(error: Error | unknown): boolean {
  if (!error) return true;

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);

  const errorName = error instanceof Error ? error.name : "";

  return EXPECTED_ERROR_PATTERNS.some(
    (pattern) => pattern.test(errorMessage) || pattern.test(errorName)
  );
}

// ============================================================================
// PostHog Forwarding Backstop
// ============================================================================

/**
 * Forward a captured error to PostHog as a resilient backstop, so error
 * visibility never drops to zero when Sentry is dark (quota/spike-protection
 * or a missing DSN). Server uses posthog-node; client uses the already-loaded
 * browser SDK (no posthog-node in the client bundle). Fire-and-forget and
 * fully guarded — telemetry forwarding must never throw into the caller.
 */
export function forwardToPostHog(
  error: Error,
  properties: Record<string, unknown>,
  distinctId?: string
): void {
  if (process.env.NODE_ENV !== "production") return;
  try {
    if (typeof window === "undefined") {
      // Server: API routes, Socket.IO backend, cron jobs.
      void import("@/lib/posthog")
        .then(({ getPostHogServer }) => {
          getPostHogServer()?.captureException(error, distinctId, properties);
        })
        .catch(() => {});
    } else {
      // Client: browser SDK initialized in PostHogProvider.
      const ph = (
        window as unknown as {
          posthog?: {
            captureException?: (
              e: unknown,
              p?: Record<string, unknown>
            ) => void;
          };
        }
      ).posthog;
      ph?.captureException?.(error, properties);
    }
  } catch {
    // Never let telemetry forwarding break the caller.
  }
}

/**
 * Per-session dedupe of high-frequency telemetry signals. A missing translation
 * key is hit on every render; without this we'd recreate the very flood that
 * exhausted Sentry's quota. Bounded in practice by the number of unique
 * (event + properties) signatures — small for translation keys.
 * ponytail: unbounded Set; if signature cardinality ever explodes, cap it (LRU).
 */
const telemetryEventThrottle = new Set<string>();

/** Test-only: clear the dedupe cache between cases. */
export function __resetTelemetryThrottleForTests(): void {
  telemetryEventThrottle.clear();
}

/**
 * Emit a custom, queryable telemetry event to PostHog (e.g. 'translation_missing')
 * so error categories can be traced later via PostHog breakdowns — independent of
 * Sentry availability. Deduped per (event + properties) signature, production-only,
 * fire-and-forget. Server uses posthog-node; client uses the browser SDK.
 */
export function trackTelemetryEvent(
  event: string,
  properties: Record<string, unknown> = {},
  distinctId?: string
): void {
  if (process.env.NODE_ENV !== "production") return;

  const signature = `${event}:${JSON.stringify(properties)}`;
  if (telemetryEventThrottle.has(signature)) return;
  telemetryEventThrottle.add(signature);

  try {
    if (typeof window === "undefined") {
      void import("@/lib/posthog")
        .then(({ getPostHogServer }) => {
          getPostHogServer()?.capture({
            distinctId: distinctId ?? "server",
            event,
            properties,
          });
        })
        .catch(() => {});
    } else {
      const ph = (
        window as unknown as {
          posthog?: {
            capture?: (e: string, p?: Record<string, unknown>) => void;
          };
        }
      ).posthog;
      ph?.capture?.(event, properties);
    }
  } catch {
    // Never let telemetry forwarding break the caller.
  }
}

// ============================================================================
// Specialized Error Capture Functions
// ============================================================================

/**
 * Capture API route errors with route-specific context
 */
export function captureApiError(
  error: Error,
  route: string,
  context?: ApiErrorContext
): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[Sentry API Error] ${route}:`, error, context);
    return;
  }

  // Don't capture expected errors
  if (isExpectedError(error)) return;

  void loadSentry().then((Sentry) => {
    Sentry.withScope((scope) => {
      scope.setTag("error.type", "api_error");
      scope.setTag("api.route", route);

      if (context?.method) {
        scope.setTag("api.method", context.method);
      }
      if (context?.statusCode) {
        scope.setTag("api.status_code", String(context.statusCode));
      }
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }

      scope.setContext("api_request", {
        route,
        method: context?.method,
        statusCode: context?.statusCode,
        body: context?.body,
      });

      Sentry.captureException(error);
    });
  });

  forwardToPostHog(
    error,
    {
      "error.type": "api_error",
      "api.route": route,
      "api.method": context?.method,
      "api.status_code": context?.statusCode,
    },
    context?.userId
  );
}

/**
 * Capture Socket.IO errors with socket-specific context
 */
export function captureSocketError(
  error: Error,
  context: SocketErrorContext
): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[Sentry Socket Error] ${context.event}:`, error, context);
    return;
  }

  // Don't capture expected errors
  if (isExpectedError(error)) return;

  void loadSentry().then((Sentry) => {
    Sentry.withScope((scope) => {
      scope.setTag("error.type", "socket_error");
      scope.setTag("socket.event", context.event);

      if (context.gameCode) {
        scope.setTag("socket.game_code", context.gameCode);
      }
      if (context.isHost !== undefined) {
        scope.setTag("socket.is_host", String(context.isHost));
      }

      scope.setContext("socket_event", {
        event: context.event,
        gameCode: context.gameCode,
        socketId: context.socketId,
        username: context.username,
        isHost: context.isHost,
      });

      Sentry.captureException(error);
    });
  });

  forwardToPostHog(
    error,
    {
      "error.type": "socket_error",
      "socket.event": context.event,
      "socket.game_code": context.gameCode,
      "socket.is_host": context.isHost,
    },
    context.username
  );
}

/**
 * Capture AI service errors with operation-specific context
 */
export function captureAIServiceError(
  error: Error,
  context: AIServiceErrorContext
): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[Sentry AI Service Error] ${context.operation}:`,
      error,
      context
    );
    return;
  }

  // Don't capture rate limit errors (expected)
  if (context.isRateLimited || isExpectedError(error)) return;

  void loadSentry().then((Sentry) => {
    Sentry.withScope((scope) => {
      scope.setTag("error.type", "ai_service_error");
      scope.setTag("ai.operation", context.operation);

      if (context.language) {
        scope.setTag("ai.language", context.language);
      }
      if (context.retryAttempt !== undefined) {
        scope.setTag("ai.retry_attempt", String(context.retryAttempt));
      }

      scope.setContext("ai_operation", {
        operation: context.operation,
        word: context.word,
        language: context.language,
        retryAttempt: context.retryAttempt,
      });

      Sentry.captureException(error);
    });
  });

  forwardToPostHog(error, {
    "error.type": "ai_service_error",
    "ai.operation": context.operation,
    "ai.language": context.language,
    "ai.retry_attempt": context.retryAttempt,
  });
}

/**
 * Capture background operation errors (sync, notifications, etc.)
 */
export function captureBackgroundError(
  error: Error,
  context: BackgroundErrorContext
): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[Sentry Background Error] ${context.operation}:`,
      error,
      context
    );
    return;
  }

  // Don't capture expected errors
  if (isExpectedError(error)) return;

  void loadSentry().then((Sentry) => {
    Sentry.withScope((scope) => {
      scope.setTag("error.type", "background_error");
      scope.setTag("background.operation", context.operation);

      if (context.service) {
        scope.setTag("background.service", context.service);
      }
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      scope.setContext("background_operation", {
        operation: context.operation,
        service: context.service,
        userId: context.userId,
        isRetryable: context.isRetryable,
      });

      Sentry.captureException(error);
    });
  });

  forwardToPostHog(
    error,
    {
      "error.type": "background_error",
      "background.operation": context.operation,
      "background.service": context.service,
    },
    context.userId
  );
}

// ============================================================================
// Breadcrumb Helpers
// ============================================================================

/**
 * Add a game-related breadcrumb for debugging context
 */
export function addGameBreadcrumb(
  action: string,
  data: Record<string, unknown>
): void {
  void loadSentry().then((Sentry) =>
    Sentry.addBreadcrumb({
      category: "game",
      message: action,
      data,
      level: "info",
    })
  );
}

/**
 * Add an API call breadcrumb for debugging context
 */
export function addApiCallBreadcrumb(
  url: string,
  method: string,
  status?: number
): void {
  void loadSentry().then((Sentry) =>
    Sentry.addBreadcrumb({
      category: "api",
      message: `${method} ${url}`,
      data: { url, method, status },
      level: status && status >= 400 ? "warning" : "info",
    })
  );
}

/**
 * Add a Socket.IO event breadcrumb for debugging context
 */
export function addSocketEventBreadcrumb(
  event: string,
  direction: "sent" | "received"
): void {
  void loadSentry().then((Sentry) =>
    Sentry.addBreadcrumb({
      category: "socket",
      message: `${direction}: ${event}`,
      data: { event, direction },
      level: "info",
    })
  );
}
