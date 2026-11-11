'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Compass } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LessonBuilder from '@/components/teacher/LessonBuilder';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import DiscoverPanel from './DiscoverPanel';

export type LibraryTab = 'mine' | 'discover';

interface TeacherLibraryProps {
  teacherId?: string;
  classroomId?: string;
  onImportSuccess?: (lesson: LibraryLesson) => void;
}

const SECTION_ID: Record<LibraryTab, string> = { mine: 'library-mine', discover: 'library-discover' };

/** The teacher's own lists first, the shared library below; `?tab=` only scrolls to a section now. */
export function TeacherLibrary({ onImportSuccess }: TeacherLibraryProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams?.get('tab');

  useEffect(() => {
    if (requested === 'discover') document.getElementById(SECTION_ID.discover)?.scrollIntoView({ block: 'start' });
  }, [requested]);

  const goTo = useCallback(
    (next: LibraryTab) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      document.getElementById(SECTION_ID[next])?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    },
    [pathname, router, searchParams],
  );

  return (
    <div data-testid="teacher-library" className="space-y-8">
      <section id={SECTION_ID.mine} aria-labelledby="library-title" className="scroll-mt-4 space-y-3">
        <h1 id="library-title" className="font-neo-display text-2xl font-bold text-neo-white sm:text-3xl">{t('eduLibrary.title')}</h1>
        <LessonBuilder onBrowseDiscover={() => goTo('discover')} hideDiscoverLink />
      </section>

      <section id={SECTION_ID.discover} aria-labelledby="library-discover-title" className="scroll-mt-4 space-y-3 border-t-[3px] border-dashed border-neo-cream/20 pt-6">
        <h2 id="library-discover-title" className="inline-flex items-center gap-2 font-neo-display text-xl font-bold text-neo-white sm:text-2xl">
          <Compass className="size-6 text-neo-cyan" aria-hidden="true" />
          {t('eduLibrary.tabs.discover')}
        </h2>
        <DiscoverPanel onOpenMyLists={() => goTo('mine')} onShareFirst={() => goTo('mine')} onCopied={onImportSuccess} />
      </section>
    </div>
  );
}
