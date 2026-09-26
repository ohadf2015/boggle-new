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
import { getTrackedPreviousPath } from '@/contexts/NavigationContext';

export type { MpExitReason } from '@/lib/multiplayer/exitDestination';

type MpExitFn = (reason: MpExitReason) => void;

const MpExitContext = createContext<MpExitFn | null>(null);

export const MpExitProvider = MpExitContext.Provider;

/**
 * The in-app route the player came from, for `back-from-entry`.
 *
 * The SPA history NavigationProvider records on every route change wins:
 * `document.referrer` reflects only the initial document load, so after a
 * client-side hop (home → daily → multiplayer) it still names the first page.
 * The referrer is the fallback for a hard arrival (full page load from another
 * page of the app). Only a same-origin, non-MP path counts (no open redirect,
 * no loop back into MP).
 */
export function readPreviousInAppPath(): string | null {
  const tracked = getTrackedPreviousPath();
  if (isInAppPreviousPath(tracked)) return tracked;
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
