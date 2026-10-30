/**
 * The dials that change shape with the mode.
 *
 * Board modes get a timer, a grid size and a shortest-word floor; Word Hunt
 * adds the hunted word; the quiz swaps all of it for its own focus picker.
 * Showing a letter-grid control on a quiz round is a dead knob on a screen a
 * teacher is reading in front of thirty people, so each block is gated.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { Timer, Grid3x3, Ruler, Crosshair, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  eligibleHuntTargets,
  HUNT_TARGET_MIN_LENGTH,
  HUNT_TARGET_MAX_LENGTH,
} from '@/shared/utils/classroomHuntTarget';
import { VocabQuizFocusPicker } from '../vocabQuiz/VocabQuizFocusPicker';
import { LobbyChoiceRow, CALM_SELECTED, CALM_IDLE, CALM_FOCUS } from './LobbyChoiceRow';
import { ClassroomBossPicker } from '../boss/ClassroomBossPicker';
import type { ClassroomBossId } from '@/shared/types/classroomBoss';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode, type PracticeFocusSetting } from '@/shared/types/vocabQuiz';
import type { VocabularyWord } from '@/lib/supabase/education/types';

export const TIMER_MINUTES = [1, 2, 3, 5] as const;
const BOARD_SIZES = ['small', 'medium', 'large'] as const;
const MIN_WORD_LENGTHS = [2, 3, 4, 5] as const;

export interface LobbyRoundSettingsProps {
  gameMode: ClassroomGameMode;
  timerMinutes: number;
  boardSize: 'small' | 'medium' | 'large';
  minWordLength: number;
  targetWord: string;
  allPlayableWords: string[];
  lessonWords: VocabularyWord[];
  lessonLanguage?: string;
  vocabQuizFocus: PracticeFocusSetting;
  vocabQuizQuestionCount: number;
  vocabQuizSeconds: number;
  treasureChestsEnabled?: boolean;
  /** False for Boss Battle: the server never deals chests in a co-op round. */
  treasureChestsAvailable?: boolean;
  onTimerChange: (minutes: number) => void;
  onBoardSizeChange: (size: 'small' | 'medium' | 'large') => void;
  onMinWordLengthChange: (length: number) => void;
  onTargetWordChange: (word: string) => void;
  onVocabQuizFocusChange: (focus: PracticeFocusSetting) => void;
  onVocabQuizQuestionCountChange: (count: number) => void;
  onVocabQuizSecondsChange: (seconds: number) => void;
  onTreasureChestsChange?: (enabled: boolean) => void;
  /** Boss Battle only: the boss the class fights. */
  bossId?: ClassroomBossId;
  onBossChange?: (id: ClassroomBossId) => void;
}

export function LobbyRoundSettings({
  gameMode,
  timerMinutes,
  boardSize,
  minWordLength,
  targetWord,
  allPlayableWords,
  lessonWords,
  lessonLanguage,
  vocabQuizFocus,
  vocabQuizQuestionCount,
  vocabQuizSeconds,
  treasureChestsEnabled,
  treasureChestsAvailable = true,
  onTimerChange,
  onBoardSizeChange,
  onMinWordLengthChange,
  onTargetWordChange,
  onVocabQuizFocusChange,
  onVocabQuizQuestionCountChange,
  onVocabQuizSecondsChange,
  onTreasureChestsChange,
  bossId,
  onBossChange,
}: LobbyRoundSettingsProps) {
  const { t } = useLanguage();
  const isQuiz = gameMode === VOCAB_QUIZ_MODE;

  const huntTargets = useMemo(() => eligibleHuntTargets(allPlayableWords), [allPlayableWords]);

  // Changing the lesson can strip the pinned word out from under the teacher.
  // Drop it rather than sending a target the server will silently replace — a
  // rejected pin looks exactly like no pin at all.
  const pinnedStillOffered =
    !targetWord || huntTargets.some((w) => w.toUpperCase() === targetWord.toUpperCase());
  useEffect(() => {
    if (!pinnedStillOffered) onTargetWordChange('');
  }, [pinnedStillOffered, onTargetWordChange]);

  if (isQuiz) {
    return (
      <VocabQuizFocusPicker
        words={lessonWords}
        language={lessonLanguage}
        focus={vocabQuizFocus}
        questionCount={vocabQuizQuestionCount}
        secondsPerQuestion={vocabQuizSeconds}
        treasureChestsEnabled={treasureChestsEnabled}
        onFocusChange={onVocabQuizFocusChange}
        onQuestionCountChange={onVocabQuizQuestionCountChange}
        onSecondsChange={onVocabQuizSecondsChange}
        onTreasureChestsChange={treasureChestsAvailable ? onTreasureChestsChange : undefined}
        t={t}
      />
    );
  }

  return (
    <div data-testid="lobby-round-settings" className="space-y-3">
      {bossId && onBossChange && <ClassroomBossPicker value={bossId} onChange={onBossChange} />}
      <LobbyChoiceRow
        id="lobby-timer-label"
        label={t('teacher.classroom.timer.title')}
        icon={Timer}
        value={timerMinutes}
        onChange={onTimerChange}
        choices={TIMER_MINUTES.map((m) => ({ value: m, label: t(`teacher.classroom.timer.min${m}`) }))}
      />

      <LobbyChoiceRow
        id="lobby-board-label"
        label={t('teacher.classroom.board.title')}
        icon={Grid3x3}
        value={boardSize}
        onChange={onBoardSizeChange}
        choices={BOARD_SIZES.map((s) => ({ value: s, label: t(`teacher.classroom.board.${s}`) }))}
      />

      <LobbyChoiceRow
        id="lobby-minlen-label"
        label={t('teacher.classroom.minWordLength.title')}
        icon={Ruler}
        value={minWordLength}
        onChange={onMinWordLengthChange}
        choices={MIN_WORD_LENGTHS.map((len) => ({
          value: len,
          label: t(`teacher.classroom.minWordLength.len${len}`),
        }))}
      />

      {gameMode === 'word-hunt' && (
        <div>
          <div
            id="lobby-hunt-label"
            className="mb-2 flex items-center gap-1.5 font-neo-display text-sm font-bold text-neo-cream"
          >
            <Crosshair className="size-4 text-neo-cream/70" strokeWidth={3} aria-hidden="true" />
            {t('teacher.classroom.huntTarget.title')}
          </div>
          {huntTargets.length === 0 ? (
            <p className="rounded-neo border-2 border-neo-cream/35 bg-neo-navy-light px-3 py-2 font-neo-body text-xs font-bold text-neo-cream/85">
              {t('teacher.classroom.huntTarget.noneEligible', {
                min: HUNT_TARGET_MIN_LENGTH,
                max: HUNT_TARGET_MAX_LENGTH,
              })}
            </p>
          ) : (
            <div role="radiogroup" aria-labelledby="lobby-hunt-label" className="flex flex-wrap gap-2">
              {[{ value: '', label: t('teacher.classroom.huntTarget.random') }, ...huntTargets.map((w) => ({ value: w, label: w }))].map(
                (choice) => {
                  const isSelected = choice.value
                    ? targetWord.toUpperCase() === choice.value.toUpperCase()
                    : !targetWord;
                  return (
                    <button
                      key={choice.value || '_random'}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={choice.label}
                      onClick={() => onTargetWordChange(choice.value)}
                      className={cn(
                        'inline-flex min-h-9 items-center gap-1.5 rounded-neo border-2 px-3 py-1 font-neo-display text-sm font-bold transition-colors',
                        CALM_FOCUS,
                        isSelected ? CALM_SELECTED : CALM_IDLE
                      )}
                    >
                      {isSelected && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
                      {choice.label}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LobbyRoundSettings;
