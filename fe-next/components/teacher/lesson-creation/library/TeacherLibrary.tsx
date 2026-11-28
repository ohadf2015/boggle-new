'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Compass } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LessonBuilder from '@/components/teacher/LessonBuilder';
import { GAME_CARD, GAME_CARD_HOVER } from '@/components/teacher/home/homeStyles';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import { cn } from '@/lib/utils';
import DiscoverPanel from './DiscoverPanel';

export type LibraryTab = 'mine' | 'discover';

interface TeacherLibraryProps {
  teacherId?: string;
  classroomId?: string;
  onImportSuccess?: (lesson: LibraryLesson) => void;
}

const SECTION_ID: Record<LibraryTab, string> = { mine: 'library-mine', discover: 'library-discover' };
const DISCOVER_PANEL_ID = 'library-discover-panel';

/** The teacher's own lists first, the shared library in one row below them; `?tab=` only scrolls to a section. */
export function TeacherLibrary({ onImportSuccess }: TeacherLibraryProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams?.get('tab');
  const [listCount, setListCount] = useState<number | null>(null);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const discoverOpen = toggled ?? (requested === 'discover' || listCount === 0);

  const listsLoaded = listCount !== null;
  useEffect(() => {
    if (requested === 'discover' && listsLoaded) document.getElementById(SECTION_ID.discover)?.scrollIntoView({ block: 'start' });
  }, [requested, listsLoaded]);

  const goTo = useCallback(
    (next: LibraryTab) => {
      if (next === 'discover') setToggled(true);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      document.getElementById(SECTION_ID[next])?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    },
    [pathname, router, searchParams],
  );

  return (
    <div data-testid="teacher-library" className="space-y-6">
      <section id={SECTION_ID.mine} aria-labelledby="library-title" className="scroll-mt-4">
        <LessonBuilder
          heading={<h1 id="library-title" className="font-neo-display text-4xl font-black leading-none text-edu-ink sm:text-5xl">{t('eduLibrary.title')}</h1>}
          onBrowseDiscover={() => goTo('discover')}
          onListCount={setListCount}
          hideDiscoverLink
        />
      </section>

      {listsLoaded ? (
        <section id={SECTION_ID.discover} aria-labelledby="library-discover-title" className="scroll-mt-4 space-y-3">
          <div className={cn('relative flex min-h-16 items-center gap-3 px-4 py-3 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-edu-line', GAME_CARD, GAME_CARD_HOVER)}>
            <Compass className="size-7 shrink-0 text-edu-cyan-ink" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="library-discover-title" className="font-neo-display text-xl font-bold leading-tight text-edu-ink">
                <button
                  type="button"
                  data-testid="library-discover-toggle"
                  aria-expanded={discoverOpen}
                  aria-controls={DISCOVER_PANEL_ID}
                  onClick={() => setToggled(!discoverOpen)}
                  className="text-start after:absolute after:inset-0 focus:outline-hidden"
                >
                  {t('eduLibrary.tabs.discover')}
                </button>
              </h2>
              <p className="font-neo-body text-sm font-semibold text-edu-ink/80">{t('eduLibrary.discover.hint')}</p>
            </div>
            <ChevronDown className={cn('size-6 shrink-0 text-edu-ink transition-transform motion-reduce:transition-none', discoverOpen && 'rotate-180')} aria-hidden="true" />
          </div>
          {discoverOpen ? (
            <div id={DISCOVER_PANEL_ID}>
              <DiscoverPanel onOpenMyLists={() => goTo('mine')} onShareFirst={() => goTo('mine')} onCopied={onImportSuccess} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
