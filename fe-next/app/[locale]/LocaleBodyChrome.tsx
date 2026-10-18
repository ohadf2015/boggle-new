'use client';

/**
 * Client shell for the locale body. Site chrome (footer, nav, OAuth, pixels)
 * lives behind next/dynamic ssr:false so a /singleplayer load never parses it.
 * Cookie consent is the exception: those routes never render SiteExtras, so
 * HeavyPathCookieConsent mounts the same bar (still ssr:false) and CookieConsent
 * itself keeps it hidden for the quiet zone.
 * ConditionalProviders (Auth/Music/Query) mounts immediately — the r6 revert
 * of #1175's two-rAF gate: gating its dynamic chunk on rAF timestamps made
 * Lighthouse's Lantern model serialize that fetch behind main-thread work,
 * producing the ~11s simulated LCP tail (r5 runs 1+6). The chunk split itself
 * (no eager parse of Auth/Music/Query on the game route) is kept.
 */

import type { ReactNode } from 'react';
import nextDynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import ScrollToTopOnNavigate from '@/components/ScrollToTopOnNavigate';
import ChunkErrorRecovery from '@/components/ChunkErrorRecovery';
import ChunkErrorBoundary from '@/components/ChunkErrorBoundary';
import { rendersSiteChrome } from '@/lib/perf/heavyGamePath';
import { isStudentJoinPath } from '@/components/education/join/joinRoutes';
import HeavyPathCookieConsent from '@/components/consent/HeavyPathCookieConsent';
import { ConditionalProviders } from '../conditional-providers';
import type { Language } from '@/shared/types/game';

const SiteExtras = nextDynamic(() => import('./SiteExtras'), {
  ssr: false,
  loading: () => null,
});

interface LocaleBodyChromeProps {
  lang: Language;
  children: ReactNode;
}

export default function LocaleBodyChrome({ lang, children }: LocaleBodyChromeProps) {
  const pathname = usePathname();
  const siteChrome = rendersSiteChrome(pathname);
  // Exclusive with SiteExtras: chrome routes already mount CookieConsent via
  // DeferredLayoutWidgets. Join screens defer the ask (it covers the code
  // cells) — that skip stays in DeferredLayoutWidgets, and this gate must
  // not undo it if a join path is ever also heavy.
  const heavyPathConsent = !siteChrome && !isStudentJoinPath(pathname);

  const inner = (
    <>
      <ScrollToTopOnNavigate />
      <ChunkErrorRecovery />
      <div className="flex-1 flex flex-col min-h-0 relative overflow-x-clip">
        <main
          id="main-content"
          className="main-content-safe flex-1 min-h-0 flex flex-col"
          tabIndex={-1}
        >
          <div className="flex-1 flex flex-col min-h-0">
            <ChunkErrorBoundary>{children}</ChunkErrorBoundary>
          </div>
        </main>
        {siteChrome && <SiteExtras lang={lang} />}
      </div>
    </>
  );

  return (
    <ConditionalProviders lang={lang}>
      {inner}
      {heavyPathConsent && <HeavyPathCookieConsent />}
    </ConditionalProviders>
  );
}
