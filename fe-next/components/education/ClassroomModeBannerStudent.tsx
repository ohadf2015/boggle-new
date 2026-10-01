'use client';

import { BookOpen, Brain, Clock, Grid2x2, Grid3x3, LayoutGrid, RotateCw, Search, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { MODE_TRANSLATION_KEY, boardSizeLabel } from './classroomModeLabels';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface StudentModeCopy {
  nameKey: string;
  ruleKey: string;
  icon: LucideIcon;
  tone: string;
}

const ROUND_SLUG: Record<string, string> = {
  classic: 'classic',
  'word-hunt': 'wordHunt',
  blast: 'blast',
  'wheel-rush': 'wheelRush',
  'word-tower': 'wordTower',
  'sealed-bid': 'sealedBid',
  crossword: 'crossword',
};

const ICON: Record<string, LucideIcon> = {
  classic: LayoutGrid,
  'word-hunt': Search,
  blast: Zap,
  'wheel-rush': RotateCw,
  crossword: Grid3x3,
  wordcraft: Grid2x2,
  'vocab-quiz': Brain,
};

const TONE: Record<string, string> = {
  classic: 'bg-neo-lime',
  'word-hunt': 'bg-neo-pink',
  blast: 'bg-neo-orange',
  'wheel-rush': 'bg-neo-cyan',
  wordcraft: 'bg-neo-purple',
  'vocab-quiz': 'bg-neo-cyan',
};

export function studentModeCopy(mode: ClassroomGameMode | string): StudentModeCopy {
  const nameKey = `teacher.classroom.gameModes.${MODE_TRANSLATION_KEY[mode] ?? 'classic'}`;
  const ruleKey =
    mode === 'vocab-quiz'
      ? 'eduStudent.mode.vocabQuiz.rule'
      : mode === 'wordcraft'
        ? 'eduStudent.mode.wordcraft.rule'
        : `mpUi.round.mode.${ROUND_SLUG[mode] ?? 'random'}.rule`;
  return { nameKey, ruleKey, icon: ICON[mode] ?? LayoutGrid, tone: TONE[mode] ?? 'bg-neo-lime' };
}

export interface StudentModeStripProps {
  gameMode: ClassroomGameMode;
  lessonName: string;
  questionCount: number | null;
  questionSeconds: number | null;
  timerMinutes: number | null;
  timerOff: boolean;
  boardSize: string | undefined;
  t: Translate;
}

/** What a student needs before the whistle: the game, how to win it, and nothing to configure. */
export function StudentModeStrip({
  gameMode,
  lessonName,
  questionCount,
  questionSeconds,
  timerMinutes,
  timerOff,
  boardSize,
  t,
}: StudentModeStripProps) {
  const copy = studentModeCopy(gameMode);
  const Icon = copy.icon;
  const isQuiz = gameMode === 'vocab-quiz';

  return (
    <section
      data-testid="student-mode-strip"
      data-mode={gameMode}
      className="mx-auto w-full max-w-xl px-3 pt-2"
    >
      <h2 className="sr-only">{t('education.classroomGame.gameSettings')}</h2>
      <div className="flex items-center gap-3 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-3 py-1.5 shadow-hard">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-11 shrink-0 -rotate-6 items-center justify-center rounded-neo border-[3px] border-neo-black shadow-hard-sm motion-safe:animate-[lc-strip-wiggle_2.8s_ease-in-out_infinite]',
            copy.tone
          )}
        >
          <Icon className="size-6 text-neo-black" strokeWidth={2.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-neo-display text-lg font-black uppercase leading-tight tracking-tight text-neo-cream">
            {t(copy.nameKey)}
          </p>
          <p dir="auto" className="line-clamp-2 font-neo-body text-[13px] font-bold leading-snug text-neo-cream/85">
            {t(copy.ruleKey)}
          </p>
          <ul className="mt-1 flex flex-wrap items-center gap-1">
        {isQuiz ? (
          <>
            {questionCount !== null && (
              <Chip testId="classroom-quiz-question-count" icon={Brain} label={t('education.classroomGame.questions')} value={String(questionCount)} />
            )}
            {questionSeconds !== null && !timerOff && (
              <Chip
                testId="classroom-quiz-seconds"
                icon={Clock}
                label={t('education.classroomGame.perQuestion')}
                value={t('vocabQuiz.setup.seconds', { seconds: questionSeconds })}
              />
            )}
          </>
        ) : (
          <>
            {timerMinutes !== null && !timerOff && (
              <Chip icon={Clock} label={t('education.template.timer')} value={`${timerMinutes} ${t('common.minutes')}`} />
            )}
            {gameMode !== 'wordcraft' && (
              <Chip icon={Grid3x3} label={t('education.template.boardSize')} value={boardSizeLabel(boardSize)} />
            )}
          </>
        )}
        {lessonName && (
          <li className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border-2 border-neo-pink bg-neo-navy px-1.5 py-px font-neo-body text-[11px] font-bold text-neo-pink">
            <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{lessonName}</span>
          </li>
        )}
      </ul>
        </div>
      </div>
      <style>{'@keyframes lc-strip-wiggle{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(4deg) scale(1.06)}}'}</style>
    </section>
  );
}

function Chip({ icon: Icon, label, value, testId }: { icon: LucideIcon; label: string; value: string; testId?: string }) {
  return (
    <li
      data-testid={testId}
      title={label}
      className="inline-flex items-center gap-1 rounded-full border-2 border-neo-cream/60 bg-neo-navy px-1.5 py-px font-neo-body text-[11px] font-bold text-neo-cream"
    >
      <Icon aria-hidden="true" className="size-3.5 text-neo-cyan" />
      <span className="sr-only">{label}</span>
      <span>{value}</span>
    </li>
  );
}
