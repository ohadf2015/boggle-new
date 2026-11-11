'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { TV_STAGE_ZOOM_CLASS } from '@/components/education/lobby/tvStageScale';
import { ClassroomLobbyShell } from '@/components/education/lobby/ClassroomLobbyShell';
import { LobbyClassPicker } from '@/components/education/lobby/LobbyClassPicker';
import { LobbyHostSetup } from '@/components/education/lobby/LobbyHostSetup';
import { LobbyLessonStep } from '@/components/education/lobby/LobbyLessonStep';
import { LobbyGameOptions } from '@/components/education/lobby/LobbyGameOptions';
import { LobbyModeGrid } from '@/components/education/lobby/LobbyModeGrid';
import { useLobbyRoundOptions } from '@/components/education/lobby/useLobbyRoundOptions';
import { ClassroomModeCatalogue } from '@/components/education/ClassroomModeCatalogue';
import { TeacherLiveControls } from '@/components/education/TeacherLiveControls';
import { configuredRoundMinutes } from '@/lib/education/gameModes';
import { launchOf, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import type { VocabularyLesson } from '@/lib/supabase/education';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

const noop = () => {};

const CLASSES = [
  { id: 'c1', name: '7B English' },
  { id: 'c2', name: '8A English' },
];

const WORDS = ['planet', 'river', 'island', 'castle', 'forest', 'bridge', 'thunder', 'garden', 'rocket', 'window', 'pencil', 'jacket'];

const LESSONS: VocabularyLesson[] = [
  {
    id: 'l1', teacher_id: 't1', classroom_id: 'c1', name: 'Unit 4: Places', description: null, language: 'en',
    words: WORDS.map((word) => ({ word, canIntegrate: true })), is_public: false, source_game_code: null,
    created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
  },
];

const PRO = { hasPro: true, loading: false, accessTrialExpires: null };
const FREE = { hasPro: false, loading: false, accessTrialExpires: null };

/** The host lobby with fabricated classes: `v=options` opens the sheet, `v=pro` / `v=free` pick the entitlement. */
export function LobbyHostPreview({ v }: { v?: string }) {
  const { t, language } = useLanguage();
  const [classId, setClassId] = useState('c1');
  const [lessonIds, setLessonIds] = useState<string[]>(['l1']);
  const [picked, setPicked] = useState<ClassroomCatalogueId>('classic');
  const [gamesOpen, setGamesOpen] = useState(v === 'games');
  const opts = useLobbyRoundOptions({ lessons: LESSONS, selectedClassroomId: classId, setSelectedLessonIds: setLessonIds });
  const { gameMode } = launchOf(picked, opts.bossId);
  const minutes = configuredRoundMinutes(gameMode, opts);
  const words = useMemo(() => (lessonIds.length ? WORDS : []), [lessonIds]);
  const pro = v === 'pro' || v === 'options-pro';

  return (
    <div className={cn('fixed inset-0 z-[80] flex flex-col overflow-hidden bg-neo-navy', language === 'he' && 'rtl')}>
      <EducationHeader compact showBackButton title={t('education.classroomGame.title')} />
      <main className={cn('relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-3', TV_STAGE_ZOOM_CLASS)}>
        <ClassroomLobbyShell
          pinned={<LobbyClassPicker classrooms={CLASSES} selectedId={classId} onSelect={setClassId} label={t('eduShell.host.classLabel')} />}
          aside={<ClassroomModeCatalogue selected={picked} minutes={minutes} playStyle={opts.playStyle} blockedKey={null} onGoLive={noop} />}
        >
          <LobbyHostSetup
            lessonStep={
              <LobbyLessonStep
                lessons={LESSONS}
                selectedLessonIds={lessonIds}
                onChange={setLessonIds}
                classLanguage="en"
                createHref="#"
                wordCount={words.length}
                boardLanguage="en"
                activePreset={opts.activePreset}
              />
            }
            activePreset={opts.activePreset}
            onApplyPreset={opts.applyPreset}
            options={
              <LobbyGameOptions
                opts={opts}
                roundMinutes={minutes}
                gameMode={gameMode}
                allPlayableWords={words}
                lessonWords={LESSONS[0].words}
                lessonLanguage="en"
                proAccess={pro ? PRO : FREE}
                defaultOpen={v === 'options' || v === 'options-pro'}
              />
            }
            gamesOpen={gamesOpen}
            onGamesOpenChange={setGamesOpen}
            modeGrid={<LobbyModeGrid selected={picked} recommended="classic" selectedMinutes={minutes} onPick={setPicked} t={t as T} />}
          />
        </ClassroomLobbyShell>
      </main>
    </div>
  );
}

const STUDENTS = ['Noa', 'Ido', 'Maya', 'Lior', 'Yael', 'Omer', 'Tamar', 'Eitan'].map((username) => ({ username }));

/** The teacher's in-round strip over a stand-in board; `v=paused` shows the paused state, `v=hunt` adds Skip word. */
export function LiveControlsPreview({ v }: { v?: string }) {
  const { t } = useLanguage();
  const [paused, setPaused] = useState(v === 'paused');
  return (
    <div className="flex min-h-dvh flex-col bg-neo-navy">
      <div className="mx-auto grid w-full max-w-md flex-1 place-items-center p-6">
        <div aria-hidden="true" className="grid aspect-square w-full grid-cols-4 gap-2 rounded-neo-lg border-[3px] border-neo-cream/35 p-3">
          {'PLANETRIVERSHOP'.split('').concat('X').map((ch, i) => (
            <span key={i} className="grid place-items-center rounded-neo border-2 border-neo-black bg-neo-cream font-neo-display text-2xl font-black text-neo-black">{ch}</span>
          ))}
        </div>
        <p className="sr-only">{t('education.liveControls.title')}</p>
      </div>
      <TeacherLiveControls
        isPaused={paused}
        gameMode={v === 'hunt' ? 'word-hunt' : 'classic'}
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
        onExtendTime={noop}
        onEndRound={noop}
        onSkipWord={noop}
        students={STUDENTS}
        hostUsername="Ms. Levi"
        socket={null}
      />
    </div>
  );
}
