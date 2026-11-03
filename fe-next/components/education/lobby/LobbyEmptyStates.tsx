/**
 * The two lobbies that are not lobbies yet: no classroom, or no word list.
 *
 * Split out of `ClassroomGameLobby` so the file that coordinates a launch is
 * not also two onboarding screens. Both keep their own exit: a teacher who
 * lands here by accident can get back without a browser button.
 */

'use client';

import type { ReactNode } from 'react';
import { School } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';

const CARD = 'rounded-neo border-[3px] border-neo-cream/40 bg-neo-navy p-8 shadow-hard';
/* Cream edge, not black: a black border on a navy card is invisible, and a
   secondary button nobody can find is a dead end on an onboarding screen. The
   width is `border-[3px]`, never `border-neo` — tailwind-merge folds that
   width utility into the colour class and the control ships borderless. */
const GHOST_BTN =
  'rounded-neo border-[3px] border-neo-cream bg-neo-navy px-6 py-3 font-bold text-neo-cream shadow-hard-sm transition hover:bg-neo-navy-light hover:shadow-hard';

export interface LobbyNoClassroomsProps {
  onBack: () => void;
  onCreateClassroom: () => void;
}

export function LobbyNoClassrooms({ onBack, onCreateClassroom }: LobbyNoClassroomsProps) {
  const { t } = useLanguage();
  return (
    <div className={`${CARD} text-center`}>
      <School className="mx-auto mb-4 h-12 w-12 text-neo-white" aria-hidden="true" />
      <p className="mb-4 font-neo-body text-neo-white">{t('education.classroomGame.noClassrooms')}</p>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={onBack} className={GHOST_BTN}>
          {t('common.back')}
        </button>
        <button
          type="button"
          onClick={onCreateClassroom}
          className="rounded-neo border-[3px] border-neo-black bg-neo-cyan px-6 py-3 font-bold text-neo-black shadow-hard transition hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-navy"
        >
          {t('education.classroomGame.createClassroom')}
        </button>
      </div>
    </div>
  );
}

export interface LobbyNoLessonsProps {
  /** The starter-pack grid, passed in so this file does not import it. */
  starterPacks: ReactNode;
  isCreating: boolean;
  onCreateLesson: () => void;
}

export function LobbyNoLessons({ starterPacks, isCreating, onCreateLesson }: LobbyNoLessonsProps) {
  const { t } = useLanguage();
  return (
    <div data-testid="lobby-no-lessons" className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-neo border-[3px] border-neo-cream/40 bg-neo-navy p-3 shadow-hard sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <p className="font-neo-body text-sm text-neo-white">{t('education.lesson.preferCustom')}</p>
        <button type="button" data-testid="lobby-no-lessons-library" onClick={onCreateLesson} className={`${GHOST_BTN} min-h-11 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan`}>
          {t('education.classroomGame.createLesson')}
        </button>
      </div>
      <div className={isCreating ? 'pointer-events-none opacity-50' : ''}>{starterPacks}</div>
      {isCreating && (
        <div className="mt-4 text-center">
          <PageLoader text={t('teacher.classroom.settingUp')} size="sm" nested />
        </div>
      )}
    </div>
  );
}
