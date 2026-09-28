'use client';

/**
 * Client shell for the locale body. Site chrome (footer, nav, OAuth, pixels)
 * lives behind next/dynamic ssr:false so a /singleplayer load never parses it.
 * ConditionalProviders (Auth/Music/Query) is also a dynamic import and is not
 * mounted on heavy-game routes until after first paint.
 */

import type { ReactNode } from 'react';
import nextDynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import ScrollToTopOnNavigate from '@/components/ScrollToTopOnNavigate';
import ChunkErrorRecovery from '@/components/ChunkErrorRecovery';
import ChunkErrorBoundary from '@/components/ChunkErrorBoundary';
import { isHeavyGamePath } from '@/lib/perf/heavyGamePath';
import { shouldMountHeavyClientBoot, useAfterFirstPaint } from '@/lib/perf/afterFirstPaint';
import type { Language } from '@/shared/types/game';

const ConditionalProviders = nextDynamic(
  () => import('../conditional-providers').then((m) => m.ConditionalProviders),
  { loading: () => null },
);

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
  const heavyGame = isHeavyGamePath(pathname);
  const afterPaint = useAfterFirstPaint(heavyGame);
  const mountHeavy = shouldMountHeavyClientBoot(pathname, afterPaint);

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
        {!heavyGame && <SiteExtras lang={lang} />}
      </div>
    </>
  );

  if (!mountHeavy) {
    return inner;
  }

  return <ConditionalProviders lang={lang}>{inner}</ConditionalProviders>;
}
