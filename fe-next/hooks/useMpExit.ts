'use client';

/**
 * The one way out of a multiplayer screen. Rule: no MP screen renders a raw
 * `Link`, `router.push` or `href` to a non-MP route — it calls
 * `useMpExit()(reason)`.
 *
 * Inside the MP page, PageClient provides the page's exit (leaveRoom emit,
 * session clear, exit-param strip, in-place reset, classroom hub). Outside it
 * the hook falls back to the pure `mpExit` decision with an SPA router push
 * (never a hard nav — it blanks the Capacitor static-export WebView).
 */
import { createContext, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { isInAppPreviousPath, mpExit, type MpExitReason } from '@/lib/multiplayer/exitDestination';

export type { MpExitReason } from '@/lib/multiplayer/exitDestination';

type MpExitFn = (reason: MpExitReason) => void;

const MpExitContext = createContext<MpExitFn | null>(null);

export const MpExitProvider = MpExitContext.Provider;

/**
 * The in-app route the player came from, for `back-from-entry`. Only a
 * same-origin, non-MP referrer counts (no open redirect, no loop back into MP).
 * `document.referrer` reflects the initial load, not SPA hops — a client-side
 * arrival falls back to the locale root, which is still inside the app.
 */
export function readPreviousInAppPath(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null;
  try {
    const ref = new URL(document.referrer);
    if (ref.origin !== window.location.origin) return null;
    const path = `${ref.pathname}${ref.search}`;
    return isInAppPreviousPath(path) ? path : null;
  } catch {
    return null;
  }
}

export function useMpExit(): MpExitFn {
  const pageExit = useContext(MpExitContext);
  const router = useRouter();
  const { language } = useLanguage();

  const fallback = useCallback<MpExitFn>(
    (reason) => {
      const action = mpExit(reason, {
        isClassroomMode: false,
        isHost: false,
        locale: language,
        previousPath: readPreviousInAppPath(),
      });
      router.push(action.kind === 'navigate' ? action.href : `/${language || 'en'}/multiplayer`);
    },
    [router, language],
  );

  return pageExit ?? fallback;
}
