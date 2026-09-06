/**
 * ClassroomModeSettings
 *
 * Game-mode picker plus the settings that only make sense for the chosen mode.
 * Split out of ClassroomSetupStep so per-mode controls have somewhere to live
 * without pushing the wizard past the file-size limit.
 *
 * Today that means Word Hunt's hunted word. A teacher pins it to one of their
 * own lesson words — the difference between a word game played in a classroom
 * and a lesson that happens to be a game.
 */

import { useEffect, useMemo } from 'react';
import { LayoutGrid, Search, Zap, RotateCw, Crosshair, Ruler, Brain } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  eligibleHuntTargets,
  HUNT_TARGET_MIN_LENGTH,
  HUNT_TARGET_MAX_LENGTH,
} from '@/shared/utils/classroomHuntTarget';
import { VocabQuizFocusPicker } from './vocabQuiz/VocabQuizFocusPicker';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { ClassroomGameMode, PracticeFocusSetting } from '@/shared/types/vocabQuiz';

// Translation keys are camelCase but canonical GameMode wire values are kebab.
const MODE_KEY_MAP: Partial<Record<ClassroomGameMode, string>> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
  'vocab-quiz': 'vocabQuiz',
};

const GAME_MODES: { key: ClassroomGameMode; icon: typeof LayoutGrid; color: string }[] = [
  { key: 'classic', icon: LayoutGrid, color: 'neo-cyan' },
  { key: 'word-hunt', icon: Search, color: 'neo-lime' },
  { key: 'blast', icon: Zap, color: 'neo-pink' },
  { key: 'wheel-rush', icon: RotateCw, color: 'neo-purple' },
  // The only mode here that is not played on a letter grid: a live 4-choice
  // question round built from the teacher's own word data.
  { key: 'vocab-quiz', icon: Brain, color: 'neo-cyan' },
];

/**
 * Shortest word that scores. A second-grade class and a tenth-grade class want
 * very different floors here, and it is the single cheapest lever a teacher has
 * for matching the game to the grade.
 */
const MIN_WORD_LENGTHS = [2, 3, 4, 5] as const;

export interface ClassroomModeSettingsProps {
  gameMode: ClassroomGameMode;
  /** The lesson word pinned as the Word Hunt target; '' means let the game pick. */
  targetWord: string;
  minWordLength: number;
  allPlayableWords: string[];
  onGameModeChange: (mode: ClassroomGameMode) => void;
  onTargetWordChange: (word: string) => void;
  onMinWordLengthChange: (length: number) => void;
  /** Rich per-word lesson data — the Vocab Quiz builds its questions from this. */
  lessonWords: VocabularyWord[];
  /** Lesson language, so the picker's counts match what the server will build. */
  lessonLanguage?: string;
  vocabQuizFocus: PracticeFocusSetting;
  vocabQuizQuestionCount: number;
  vocabQuizSeconds: number;
  onVocabQuizFocusChange: (focus: PracticeFocusSetting) => void;
  onVocabQuizQuestionCountChange: (count: number) => void;
  onVocabQuizSecondsChange: (seconds: number) => void;
}

export function ClassroomModeSettings({
  gameMode,
  targetWord,
  minWordLength,
  allPlayableWords,
  onGameModeChange,
  onTargetWordChange,
  onMinWordLengthChange,
  lessonWords,
  lessonLanguage,
  vocabQuizFocus,
  vocabQuizQuestionCount,
  vocabQuizSeconds,
  onVocabQuizFocusChange,
  onVocabQuizQuestionCountChange,
  onVocabQuizSecondsChange,
}: ClassroomModeSettingsProps) {
  const { t } = useLanguage();

  const huntTargets = useMemo(
    () => eligibleHuntTargets(allPlayableWords),
    [allPlayableWords]
  );

  // Changing the lesson selection can strip the pinned word out from under the
  // teacher. Drop it rather than sending a target the server will reject and
  // silently replace — a rejected pin looks identical to no pin at all.
  const pinnedIsStillOffered =
    !targetWord || huntTargets.some((w) => w.toUpperCase() === targetWord.toUpperCase());
  useEffect(() => {
    if (!pinnedIsStillOffered) onTargetWordChange('');
  }, [pinnedIsStillOffered, onTargetWordChange]);

  return (
    <div className="space-y-6">
      <div>
        <div id="classroom-gamemode-label" className="block text-neo-white font-bold mb-3">
          {t('teacher.classroom.gameModes.title')}
        </div>
        <div
          role="radiogroup"
          aria-labelledby="classroom-gamemode-label"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          {GAME_MODES.map(({ key, icon: Icon, color }) => {
            const isSelected = gameMode === key;
            const label = t(`teacher.classroom.gameModes.${MODE_KEY_MAP[key]}`);
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={label}
                onClick={() => onGameModeChange(key)}
                className={cn(
                  'flex flex-col items-center gap-2 px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
                  isSelected
                    ? `bg-${color} text-neo-black shadow-hard`
                    : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {gameMode === 'vocab-quiz' && (
        <VocabQuizFocusPicker
          words={lessonWords}
          language={lessonLanguage}
          focus={vocabQuizFocus}
          questionCount={vocabQuizQuestionCount}
          secondsPerQuestion={vocabQuizSeconds}
          onFocusChange={onVocabQuizFocusChange}
          onQuestionCountChange={onVocabQuizQuestionCountChange}
          onSecondsChange={onVocabQuizSecondsChange}
          t={t}
        />
      )}

      {gameMode === 'word-hunt' && (
        <div>
          <div id="classroom-hunt-target-label" className="block text-neo-white font-bold mb-1">
            <Crosshair className="w-5 h-5 inline me-2 text-neo-lime" />
            {t('teacher.classroom.huntTarget.title')}
          </div>
          <p className="text-sm text-neo-white/70 font-neo-body mb-3">
            {t('teacher.classroom.huntTarget.description')}
          </p>

          {huntTargets.length === 0 ? (
            <p className="p-3 rounded-neo border border-neo-lime/30 bg-neo-lime/10 text-neo-white font-neo-body text-sm">
              {t('teacher.classroom.huntTarget.noneEligible', {
                min: HUNT_TARGET_MIN_LENGTH,
                max: HUNT_TARGET_MAX_LENGTH,
              })}
            </p>
          ) : (
            <div
              role="radiogroup"
              aria-labelledby="classroom-hunt-target-label"
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={!targetWord}
                aria-label={t('teacher.classroom.huntTarget.random')}
                onClick={() => onTargetWordChange('')}
                className={cn(
                  'px-4 py-2 font-bold rounded-neo border-neo border-neo-black transition-all text-sm',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
                  !targetWord
                    ? 'bg-neo-lime text-neo-black shadow-hard'
                    : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                )}
              >
                {t('teacher.classroom.huntTarget.random')}
              </button>
              {huntTargets.map((word) => {
                const isSelected = targetWord.toUpperCase() === word.toUpperCase();
                return (
                  <button
                    key={word}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={word}
                    onClick={() => onTargetWordChange(word)}
                    className={cn(
                      'px-4 py-2 font-bold rounded-neo border-neo border-neo-black transition-all text-sm',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
                      isSelected
                        ? 'bg-neo-lime text-neo-black shadow-hard'
                        : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                    )}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Board-only: a quiz has no letter grid, so a minimum word length is
          meaningless there and would just be a dead control on the screen. */}
      {gameMode !== 'vocab-quiz' && (
      <div>
        <div id="classroom-minlen-label" className="block text-neo-white font-bold mb-3">
          <Ruler className="w-5 h-5 inline me-2 text-neo-cyan" />
          {t('teacher.classroom.minWordLength.title')}
        </div>
        <div
          role="radiogroup"
          aria-labelledby="classroom-minlen-label"
          className="grid grid-cols-4 gap-3"
        >
          {MIN_WORD_LENGTHS.map((len) => {
            const isSelected = minWordLength === len;
            const label = t(`teacher.classroom.minWordLength.len${len}`);
            return (
              <button
                key={len}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={label}
                onClick={() => onMinWordLengthChange(len)}
                className={cn(
                  'px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
                  isSelected
                    ? 'bg-neo-cyan text-neo-black shadow-hard'
                    : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
