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
 * deep-link; guests are anonymous (tracked only by a tab-stable session id).
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const HEARTBEAT_INTERVAL_MS = 20000;
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

export default function PagePresenceReporter() {
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

    const send = () => {
      const { user: u, profile: p } = identityRef.current;
      const username =
        p?.display_name ||
        p?.username ||
        (typeof window !== 'undefined'
          ? window.localStorage?.getItem('guestUsername') ?? null
          : null);
      try {
        fetch('/api/presence/heartbeat', {
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
        }).catch(() => {
          // Silently ignore fetch failures (e.g., iOS Safari's keepalive limitations).
          // Presence reporting is a best-effort signal; a failed heartbeat should not
          // disrupt the player experience or bubble up to error tracking.
        });
      } catch {
        /* ignore synchronous errors during fetch creation */
      }
    };

    send();
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS);

    // No unload beacon: the server TTL (45s) reaps closed tabs. A POST-only
    // sendBeacon here would lack a path and re-add the session at "/".
    return () => {
      clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
