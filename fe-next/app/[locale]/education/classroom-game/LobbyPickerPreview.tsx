'use client';

/** DEV-ONLY `?preview=lobby`: the teacher's game picker with fabricated classes, so it can be judged without an account. */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { TV_STAGE_ZOOM_CLASS } from '@/components/education/lobby/tvStageScale';
import { ClassroomLobbyShell } from '@/components/education/lobby/ClassroomLobbyShell';
import { LobbyClassPicker } from '@/components/education/lobby/LobbyClassPicker';
import { LobbyModeGrid } from '@/components/education/lobby/LobbyModeGrid';
import { ClassroomModeCatalogue } from '@/components/education/ClassroomModeCatalogue';
import { wordcraftBlockReason, WORDCRAFT_BLOCK_TILE_KEY } from '@/components/education/lobby/wordcraftPlayable';
import type { ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

const SAMPLE_LISTS: Record<string, string[]> = {
  en: ['cat', 'river', 'planet'],
  he: ['שלום', 'ספר', 'חלון'],
  es: ['gato', 'árbol', 'nube'],
  ja: ['ねこ', 'さくら', 'そら'],
  ru: ['кот', 'река', 'облако'],
  sv: ['katt', 'moln', 'båt'],
};

const CLASSES = [
  { id: 'c1', name: '7B English' },
  { id: 'c2', name: '8A English' },
  { id: 'c3', name: 'Spanish club' },
];

export function LobbyPickerPreview() {
  const { t, language } = useLanguage();
  const [classId, setClassId] = useState('c1');
  const [picked, setPicked] = useState<ClassroomCatalogueId>('classic');
  const list = useSearchParams()?.get('list') ?? '';
  const blocked = useMemo(() => {
    const words = SAMPLE_LISTS[list];
    const reason = words ? wordcraftBlockReason(words, { lessonLanguage: list }) : null;
    return reason ? { wordcraft: WORDCRAFT_BLOCK_TILE_KEY[reason] } : {};
  }, [list]);

  return (
    <div className={cn('fixed inset-0 z-[80] flex flex-col overflow-hidden bg-neo-navy', language === 'he' && 'rtl')}>
      <EducationHeader compact showBackButton title={t('education.classroomGame.title')} />
      <main className={cn('relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-3', TV_STAGE_ZOOM_CLASS)}>
        <ClassroomLobbyShell
          pinned={<LobbyClassPicker classrooms={CLASSES} selectedId={classId} onSelect={setClassId} label={t('eduShell.host.classLabel')} />}
          aside={
            <ClassroomModeCatalogue selected={picked} minutes={3} playStyle="ffa" blockedKey={null} onGoLive={() => toast('Preview: go live')} />
          }
        >
          <LobbyModeGrid selected={picked} recommended="classic" selectedMinutes={3} blocked={blocked} onPick={setPicked} t={t as T} />
        </ClassroomLobbyShell>
      </main>
    </div>
  );
}

export default LobbyPickerPreview;
