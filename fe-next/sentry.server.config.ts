import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Environment tag
  environment: process.env.NODE_ENV,

  // Performance monitoring sample rate
  tracesSampleRate: 0.1,

  // Release tracking
  release:
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    undefined,

  // Ignore expected/handled errors
  ignoreErrors: [
    // AI hint generation failures - handled gracefully with fallback hints
    // These occur when Vertex AI returns error pages or rate limits
    "[API] AI hint generation failed",
    /\[api\].*ai hint generation failed/i,
    /unexpected token.*<!doctype/i,
    // Rate limiting - handled gracefully by clients
    /rate limit/i,
    /too many requests/i,
    // Network timeouts - expected transient errors
    /timeout/i,
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    // Solve-grid blacklist Supabase 502 — returns unfiltered words as fallback
    /\[SOLVE-GRID\].*Blacklist query error/i,
    // Supabase updatePlayerStats transient errors — retried by client
    /\[SUPABASE\].*updatePlayerStats error/i,
    /\[SUPABASE\].*Failed to update profile stats/i,
    // Supabase deadlock retries — handled by retryOnDeadlock helper, auto-recovers
    /\[SUPABASE\].*Deadlock on.*retry/i,
    // Supabase leaderboard upsert errors — retried internally, non-critical (JAVASCRIPT-NEXTJS-XT)
    /\[SUPABASE\].*updateLeaderboardEntry error/i,
    // Word Hunt player count transient query failure — non-critical stat
    /\[API\].*Word Hunt total players count error/i,
    // AI word validation retries and failures — handled gracefully with fallback
    // These are transient Vertex AI errors during word validation (JAVASCRIPT-NEXTJS-QC + ~80 retry issues)
    /\[AI_SERVICE\].*validateWord/i,
    /\[AI_SERVICE\].*validateAndSaveWord/i,
    /\[AI_SERVICE\].*AI validation failed/i,
    /\[AI_SERVICE\].*attempt.*failed.*retrying/i,
    /\[AI_SERVICE\].*failed after.*attempts/i,
    // Bot requests hitting [locale] route with invalid params (e.g. /.rss/blog/...)
    /Incorrect locale information provided/i,
    // Avatar PNG render (JAVASCRIPT-NEXTJS-1HW + 1DV) — server-side React-tree
    // render of avatar_config is architecturally unsupported: the avatar parts
    // depend on 'use client' contexts (useAvatarUid/useEyeColor), and Turbopack
    // forbids `createContext` from entering the route-handler server graph, so
    // <Context.Provider> resolves to undefined ("Element type is invalid") and
    // the hooks throw ("call the default export from the server"). The route
    // degrades gracefully (404 → mascot push fallback, 0 users impacted). Real
    // fix = a context-free server-only SVG renderer (tracked in
    // docs/superpowers/specs/2026-05-25-avatar-png-server-renderer.md).
    /\[AVATAR_PNG\] render failed/i,
    // Race condition on duplicate word submit — non-critical
    /Error inserting player word/i,
    // Transient API failure for non-critical stat
    /Word Hunt leaderboard count error/i,
  ],
});
