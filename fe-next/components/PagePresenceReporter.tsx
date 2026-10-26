'use client';

/**
 * PagePresenceReporter
 *
 * Lightweight global beacon: reports the current page to the server so the admin
 * live monitor can see users who are online but NOT in a game (landing page,
 * lobby browsing, etc). Mirrors the single-player heartbeat but fires on every
 * page. Admin pages are skipped both here and server-side.
 *
 * Identity is best-effort: authed users include playerId so the admin view can
 * deep-link; guests get a persisted fun default name (never the literal "Guest").
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ensureGuestDisplayName } from '@/utils/guestManager';

const HEARTBEAT_INTERVAL_MS = 20000;
/**
 * Failure backoff: after MAX_FAST_FAILURES consecutive failures the interval
 * grows 60s -> 2m -> 4m -> 5m (cap), resetting to 20s on the first success.
 * UR audit 2026-10-26: one admin tab with a dead endpoint fired 2,603 failing
 * heartbeats in 24h (~2/min around the clock), flooding FDT telemetry.
 */
const MAX_FAST_FAILURES = 3;
const BACKOFF_BASE_MS = 60_000;
const BACKOFF_CAP_MS = 300_000;
const SID_KEY = 'lc_presence_sid';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = window.sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export default function PagePresenceReporter({ language = 'en' }: { language?: string } = {}) {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  // Keep latest identity in a ref so the interval doesn't churn on auth changes.
  const identityRef = useRef({ user, profile });
  identityRef.current = { user, profile };

  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    // Don't track admins viewing the dashboard (server enforces too).
    if (pathname && pathname.includes('/admin')) return;

    const sessionId = getSessionId();
    if (!sessionId) return;

    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let inFlight = false;

    const isHidden = () =>
      typeof document !== 'undefined' && document.visibilityState === 'hidden';

    /** Returns true when the heartbeat reached the server (2xx). */
    const send = async (): Promise<boolean> => {
      const { user: u, profile: p } = identityRef.current;
      const username =
        p?.display_name ||
        p?.username ||
        (typeof window !== 'undefined' ? ensureGuestDisplayName(language) || null : null);
      try {
        const res = await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            sessionId,
            path: pathRef.current,
            username,
            playerId: u?.id ?? null,
            isAuthenticated: !!u,
          }),
        });
        return res.ok;
      } catch {
        // Presence reporting is best-effort; a failed heartbeat must not disrupt
        // the player experience. It DOES count toward backoff so a dead endpoint
        // can't burn ~2 requests/minute for a whole day.
        return false;
      }
    };

    const nextDelay = () => {
      if (failures < MAX_FAST_FAILURES) return HEARTBEAT_INTERVAL_MS;
      return Math.min(BACKOFF_BASE_MS * 2 ** (failures - MAX_FAST_FAILURES), BACKOFF_CAP_MS);
    };

    const schedule = () => {
      if (disposed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, nextDelay());
    };

    const tick = async () => {
      if (disposed || inFlight) return;
      // Hidden tabs are reaped by the server's 45s TTL anyway — don't
      // heartbeat from a background tab, just keep the loop alive.
      if (isHidden()) {
        schedule();
        return;
      }
      inFlight = true;
      const ok = await send();
      inFlight = false;
      failures = ok ? 0 : failures + 1;
      schedule();
    };

    const onVisibility = () => {
      if (disposed || isHidden()) return;
      // Back in the foreground: the TTL likely reaped us, so re-announce
      // immediately and resume the normal cadence.
      if (timer) clearTimeout(timer);
      void tick();
    };

    void tick();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    // No unload beacon: the server TTL (45s) reaps closed tabs. A POST-only
    // sendBeacon here would lack a path and re-add the session at "/".
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [pathname, language]);

  return null;
}
