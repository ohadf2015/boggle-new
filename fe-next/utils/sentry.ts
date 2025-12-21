import * as Sentry from "@sentry/nextjs";

interface ProfileData {
  username?: string;
  is_admin?: boolean;
  total_games?: number;
  country_code?: string | null;
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
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Clear user context on logout
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
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

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("additional", context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Set game context for better error grouping
 */
export function setGameContext(
  gameCode: string | null,
  language?: string
): void {
  if (gameCode) {
    Sentry.setTag("game_code", gameCode);
    if (language) {
      Sentry.setTag("game_language", language);
    }
  } else {
    Sentry.setTag("game_code", undefined);
    Sentry.setTag("game_language", undefined);
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
      Sentry.setContext("logrocket", {
        sessionURL,
      });
      Sentry.setTag("logrocket_session", sessionURL);
    });
  }
}
