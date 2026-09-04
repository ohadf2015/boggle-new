/**
 * StudentViewPreview
 *
 * "Preview what students will see" — a modal that walks the teacher through
 * the three screens a student meets (join → waiting room → game) inside a
 * phone-shaped frame, using the classroom's real join code and the settings
 * currently chosen in the setup wizard.
 *
 * The sample board is generated client-side and deterministically from a seed
 * (lib/education/previewBoard.ts) so "Shuffle" is a reseed, not a coin flip,
 * and the teacher learns BEFORE class which lesson words cannot be hidden on a
 * board and why.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Shuffle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';
import {
  classifyLessonWords,
  generatePreviewBoard,
  PREVIEW_BOARD_DIMS,
  type PreviewSkippedWord,
} from '@/lib/education/previewBoard';
import type { Classroom, VocabularyLesson } from '@/lib/supabase/education/types';
import type { GameMode } from '@/shared/types/game';
import { PhoneFrame } from './student-preview/PhoneFrame';
import { PreviewJoinScreen } from './student-preview/PreviewJoinScreen';
import { PreviewWaitingScreen } from './student-preview/PreviewWaitingScreen';
import { PreviewGameScreen } from './student-preview/PreviewGameScreen';

export interface StudentViewPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: Pick<Classroom, 'name' | 'join_code' | 'language'> | null | undefined;
  lessons: Pick<VocabularyLesson, 'id' | 'name' | 'language' | 'words'>[];
  gameMode: GameMode;
  timerMinutes: number;
  boardSize: 'small' | 'medium' | 'large';
  minWordLength: number;
}

const STEPS = ['join', 'waiting', 'game'] as const;
type Step = (typeof STEPS)[number];

const TITLE_ID = 'student-preview-title';

export function StudentViewPreview({
  isOpen,
  onClose,
  classroom,
  lessons,
  gameMode,
  timerMinutes,
  boardSize,
  minWordLength,
}: StudentViewPreviewProps) {
  const { t, language: uiLanguage, dir } = useLanguage();
  const studentDir: 'ltr' | 'rtl' = dir === 'rtl' ? 'rtl' : 'ltr';

  const [stepIndex, setStepIndex] = useState(0);
  const [seed, setSeed] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);

  // Portal target is only known client-side; gate on mount to stay SSR-safe.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Always reopen on the first screen — the teacher is re-checking from the top.
  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  useFocusTrap(panelRef, isOpen, onClose);

  // Lock body scroll while open (page sliding behind the backdrop flickers on touch).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const joinCode = classroom?.join_code ?? '';
  const language = classroom?.language ?? lessons[0]?.language ?? uiLanguage ?? 'en';
  const { rows, cols } = PREVIEW_BOARD_DIMS[boardSize];

  const triage = useMemo(
    () => classifyLessonWords(lessons.flatMap((lesson) => lesson.words ?? [])),
    [lessons]
  );

  const board = useMemo(
    () => generatePreviewBoard({ rows, cols, words: triage.integrable, language, seed }),
    [rows, cols, triage.integrable, language, seed]
  );

  // Lesson-level rejections first (they never change with the board), then
  // board-level ones (size / sample budget) so the teacher reads the fixable
  // ones — "pick a bigger board" — right below the permanent ones.
  const skipped: PreviewSkippedWord[] = useMemo(
    () => [...triage.skipped, ...board.skipped],
    [triage.skipped, board.skipped]
  );

  const step: Step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (isLast) onClose();
    else setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [isLast, onClose]);
  const goBack = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);
  const shuffle = useCallback(() => setSeed((s) => s + 1), []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-neo-navy/90 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[94vh] w-full max-w-3xl flex-col rounded-neo border-3 border-neo-black bg-neo-navy shadow-hard-lg"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b-3 border-neo-black p-4 pe-14">
          <div className="min-w-0 flex-1">
            <h2 id={TITLE_ID} className="font-neo-display text-xl font-black text-neo-cream sm:text-2xl">
              {t('education.studentPreview.title')}
            </h2>
            <p className="mt-0.5 text-sm text-neo-white/70">{t('education.studentPreview.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('education.studentPreview.close')}
            className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-cream shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <X size={18} strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="border-b-3 border-neo-black bg-neo-navy-light px-4 py-3">
          <ol className="flex items-center gap-2" aria-label={t('education.studentPreview.stepsLabel')}>
            {STEPS.map((s, i) => {
              const isCurrent = i === stepIndex;
              const isDone = i < stepIndex;
              return (
                <li key={s} className="flex min-w-0 items-center gap-2" aria-current={isCurrent ? 'step' : undefined}>
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-neo-black font-neo-display text-xs font-black',
                      isCurrent && 'bg-neo-cyan text-neo-black shadow-hard-sm',
                      isDone && 'bg-neo-lime text-neo-black',
                      !isCurrent && !isDone && 'bg-neo-navy text-neo-white/60'
                    )}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      'truncate text-sm font-bold',
                      isCurrent ? 'text-neo-cream' : 'text-neo-white/60'
                    )}
                  >
                    {t(`education.studentPreview.steps.${s}`)}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="mx-1 h-0.5 w-4 shrink-0 bg-neo-white/30 sm:w-8" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
          <p data-testid="student-preview-step" className="sr-only">
            {t('education.studentPreview.stepOf', { current: stepIndex + 1, total: STEPS.length })}{' '}
            {t(`education.studentPreview.steps.${step}`)}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:justify-center">
            <PhoneFrame dir={studentDir}>
              {step === 'join' && <PreviewJoinScreen t={t} joinCode={joinCode} />}
              {step === 'waiting' && (
                <PreviewWaitingScreen
                  t={t}
                  joinCode={joinCode}
                  gameMode={gameMode}
                  timerMinutes={timerMinutes}
                  boardSize={boardSize}
                  rows={rows}
                  cols={cols}
                  minWordLength={minWordLength}
                />
              )}
              {step === 'game' && (
                <PreviewGameScreen
                  t={t}
                  board={board}
                  gameMode={gameMode}
                  timerMinutes={timerMinutes}
                  minWordLength={minWordLength}
                />
              )}
            </PhoneFrame>

            {/* Teacher-side notes */}
            <div className="w-full min-w-0 space-y-4 md:flex-1">
              {step === 'join' && (
                <TeacherNote>
                  <p>{t('education.studentPreview.join.caption')}</p>
                  <p dir="ltr" className="mt-2 break-all font-mono text-sm font-bold text-neo-cyan">
                    {`${typeof window !== 'undefined' ? window.location.host : ''}/${uiLanguage}/join/${joinCode}`}
                  </p>
                  {classroom?.name && (
                    <p className="mt-2 text-neo-white/70">
                      {t('education.studentPreview.join.classroomHint', { name: classroom.name })}
                    </p>
                  )}
                </TeacherNote>
              )}

              {step === 'waiting' && (
                <TeacherNote>
                  <p>{t('education.studentPreview.waiting.teacherHint')}</p>
                </TeacherNote>
              )}

              {step === 'game' && (
                <>
                  <div className="rounded-neo border-3 border-neo-black bg-neo-cream p-3 shadow-hard">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-navy">
                        {t('education.studentPreview.game.hiddenWords')}
                      </h3>
                      <button
                        type="button"
                        onClick={shuffle}
                        className="inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-cyan px-2.5 py-1 text-xs font-black text-neo-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('education.studentPreview.shuffle')}
                      </button>
                    </div>
                    <ul data-testid="student-preview-hidden-words" className="flex flex-wrap gap-1.5">
                      {board.embedded.length === 0 && (
                        <li className="text-xs text-neo-navy/70">
                          {t('education.studentPreview.game.noneHidden')}
                        </li>
                      )}
                      {board.embedded.map((word) => (
                        <li
                          key={word}
                          className="rounded-neo-sm border-2 border-neo-black bg-neo-lime px-2 py-0.5 text-xs font-black text-neo-navy"
                        >
                          {word}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-neo-navy/70">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{t('education.studentPreview.freshBoardNote')}</span>
                    </p>
                  </div>

                  <div className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-3">
                    <h3 className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream">
                      {t('education.studentPreview.skipped.title')}
                    </h3>
                    <p className="mb-2 text-xs text-neo-white/60">
                      {t('education.studentPreview.skipped.subtitle')}
                    </p>
                    <ul data-testid="student-preview-skipped-words" className="space-y-1">
                      {skipped.length === 0 && (
                        <li className="text-xs text-neo-lime">{t('education.studentPreview.skipped.none')}</li>
                      )}
                      {skipped.map(({ word, reason }, i) => (
                        <li
                          key={`${word}-${reason}-${i}`}
                          className="flex items-baseline justify-between gap-3 rounded-neo-sm bg-neo-navy px-2 py-1 text-xs"
                        >
                          <span className="font-bold text-neo-white">{word}</span>
                          <span className="text-end text-neo-white/70">
                            {t(`education.studentPreview.skipped.reason.${reason}`, { max: Math.max(rows, cols) })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t-3 border-neo-black p-4">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1 rounded-neo border-3 border-neo-black bg-neo-navy-light px-4 py-2 font-bold text-neo-white shadow-hard-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t('education.studentPreview.back')}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1 rounded-neo border-3 border-neo-black bg-neo-cyan px-5 py-2 font-black text-neo-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLast ? t('education.studentPreview.done') : t('education.studentPreview.next')}
            {!isLast && <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TeacherNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-neo border-3 border-neo-black bg-neo-cream p-3 text-sm text-neo-navy shadow-hard">
      {children}
    </div>
  );
}

export default StudentViewPreview;
