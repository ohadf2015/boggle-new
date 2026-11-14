'use client';

import { useSyncExternalStore } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AcademyPlaque } from '@/components/student/academy/AcademyPlaque';
import { AcademyDock } from '@/components/student/academy/AcademyDock';
import type { ResolvedEducationNav } from './navItems';

// A laptop window (1366x599) or a phone on its side: a bottom dock would cost the page a third of its height.
const SHORT_LANDSCAPE = '(orientation: landscape) and (max-height: 759px)';

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(SHORT_LANDSCAPE);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** True when the student dock rides in the plaque row instead of the bottom. */
export function useTopDock(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === 'function' && window.matchMedia(SHORT_LANDSCAPE).matches,
    () => false,
  );
}

/** A student screen's top: the map's title plaque, named by the page or by its tab. */
export function StudentAcademyTop({ nav, title, topDock }: { nav: ResolvedEducationNav; title?: string; topDock: boolean }) {
  const { t } = useLanguage();
  const tab = nav.items.find((item) => item.key === nav.activeKey);
  return (
    <div data-testid="student-academy-top" className="shrink-0 px-3 pt-2 sm:px-6 sm:pt-3">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2">
        <AcademyPlaque title={title ?? (tab ? t(tab.labelKey) : '')} compact={topDock} />
        {topDock && (
          <div className="shrink-0">
            <AcademyDock locale={nav.locale} reviewCount={0} iconOnly />
          </div>
        )}
      </div>
    </div>
  );
}

/** A student screen's bottom: the same dock as the map, so every page leads back into the world. */
export function StudentAcademyDock({ nav }: { nav: ResolvedEducationNav }) {
  return (
    <div className="shrink-0 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 sm:px-6 sm:pb-4">
      <div className="mx-auto w-full max-w-xl">
        <AcademyDock locale={nav.locale} reviewCount={0} />
      </div>
    </div>
  );
}
