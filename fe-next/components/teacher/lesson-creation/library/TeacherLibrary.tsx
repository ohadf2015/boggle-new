'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Compass } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { cn } from '@/lib/utils';
import LessonBuilder from '@/components/teacher/LessonBuilder';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import DiscoverPanel from './DiscoverPanel';

export type LibraryTab = 'mine' | 'discover';

interface TeacherLibraryProps {
  teacherId?: string;
  classroomId?: string;
  onImportSuccess?: (lesson: LibraryLesson) => void;
}

export function TeacherLibrary({ onImportSuccess }: TeacherLibraryProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lessons, isLoading } = useLessons();
  const requested = searchParams?.get('tab');
  const [tab, setTabState] = useState<LibraryTab>(() =>
    requested === 'discover' || requested === 'mine' ? requested : 'discover',
  );

  const setTab = useCallback(
    (next: LibraryTab) => {
      setTabState(next);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const tabs: { key: LibraryTab; label: string; icon: typeof Compass; count?: number }[] = [
    { key: 'discover', label: t('eduLibrary.tabs.discover'), icon: Compass },
    { key: 'mine', label: t('eduLibrary.tabs.mine'), icon: BookOpen, count: isLoading ? undefined : lessons.length },
  ];

  return (
    <div data-testid="teacher-library" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-neo-display text-2xl font-bold text-neo-white sm:text-3xl">{t('eduLibrary.title')}</h1>
        <div role="tablist" aria-label={t('eduLibrary.title')} className="flex rounded-neo border-3 border-neo-cream bg-neo-navy-light p-1 shadow-hard-sm">
          {tabs.map(({ key, label, icon: Icon, count }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`library-tab-${key}`}
                aria-selected={active}
                aria-controls={`library-panel-${key}`}
                onClick={() => setTab(key)}
                className={cn(
                  'inline-flex min-h-10 items-center gap-1.5 rounded px-3 font-neo-display text-sm font-bold uppercase transition-all',
                  active ? 'bg-neo-lime text-neo-black shadow-hard-sm' : 'text-neo-white hover:bg-neo-white/10',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
                {count !== undefined && (
                  <span className={cn('rounded px-1 text-xs tabular-nums', active ? 'bg-neo-black/15' : 'bg-neo-white/15')}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={`library-panel-${tab}`} aria-labelledby={`library-tab-${tab}`}>
        {tab === 'discover' ? (
          <DiscoverPanel onOpenMyLists={() => setTab('mine')} onShareFirst={() => setTab('mine')} onCopied={onImportSuccess} />
        ) : (
          <LessonBuilder onBrowseDiscover={() => setTab('discover')} hideDiscoverLink />
        )}
      </div>
    </div>
  );
}
