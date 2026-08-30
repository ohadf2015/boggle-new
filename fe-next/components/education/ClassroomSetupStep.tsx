import { School, BookOpen, Timer, Grid3x3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { WizardStep } from '@/components/ui/WizardStep';
import { MultiLessonSelector } from './MultiLessonSelector';
import { ClassroomModeSettings } from './ClassroomModeSettings';
import type { VocabularyLesson, Classroom } from '@/lib/supabase/education';
import type { GameMode } from '@/shared/types/game';

interface ClassroomSetupStepProps {
  classrooms: Classroom[];
  lessons: VocabularyLesson[];
  selectedClassroomId: string;
  selectedLessonIds: string[];
  allPlayableWords: string[];
  gameMode: GameMode;
  targetWord: string;
  minWordLength: number;
  timerMinutes: number;
  boardSize: 'small' | 'medium' | 'large';
  isStarting: boolean;
  onSelectClassroom: (id: string) => void;
  onSelectLessons: (ids: string[]) => void;
  onGameModeChange: (mode: GameMode) => void;
  onTargetWordChange: (word: string) => void;
  onMinWordLengthChange: (length: number) => void;
  onTimerChange: (minutes: number) => void;
  onBoardSizeChange: (size: 'small' | 'medium' | 'large') => void;
  onNext: () => void;
  onBack: () => void;
}

const TIMER_OPTIONS: { minutes: number; labelKey: string }[] = [
  { minutes: 1, labelKey: 'teacher.classroom.timer.min1' },
  { minutes: 2, labelKey: 'teacher.classroom.timer.min2' },
  { minutes: 3, labelKey: 'teacher.classroom.timer.min3' },
  { minutes: 5, labelKey: 'teacher.classroom.timer.min5' },
];

const BOARD_SIZES: { key: 'small' | 'medium' | 'large'; labelKey: string }[] = [
  { key: 'small', labelKey: 'teacher.classroom.board.small' },
  { key: 'medium', labelKey: 'teacher.classroom.board.medium' },
  { key: 'large', labelKey: 'teacher.classroom.board.large' },
];

export function ClassroomSetupStep({
  classrooms,
  lessons,
  selectedClassroomId,
  selectedLessonIds,
  allPlayableWords,
  gameMode,
  targetWord,
  minWordLength,
  timerMinutes,
  boardSize,
  isStarting,
  onSelectClassroom,
  onSelectLessons,
  onGameModeChange,
  onTargetWordChange,
  onMinWordLengthChange,
  onTimerChange,
  onBoardSizeChange,
  onNext,
  onBack,
}: ClassroomSetupStepProps) {
  const { t } = useLanguage();

  // A lesson can be selected and still yield nothing playable — every word
  // filtered out by canIntegrate. Starting then produces a game with no
  // vocabulary and no explanation, so gate on the words themselves.
  const cannotStart =
    selectedLessonIds.length === 0 ||
    !selectedClassroomId ||
    allPlayableWords.length === 0;

  return (
    <WizardStep
      currentStep={1}
      totalSteps={1}
      title={t('education.classroomGame.selectClassroomAndLessons')}
      description={t('education.classroomGame.selectClassroomAndLessonsDesc')}
      onNext={onNext}
      onBack={onBack}
      nextLabel={t('education.classroomGame.createRoom')}
      nextDisabled={cannotStart}
      isLoading={isStarting}
    >
      <div className="space-y-6">
        {/* Classroom Selection */}
        <div>
          <label className="block text-neo-white font-bold mb-3">
            <School className="w-5 h-5 inline me-2 text-neo-cyan" />
            {t('education.classroomGame.selectClassroom')}
          </label>
          <div className="space-y-2">
            {classrooms.map((classroom) => (
              <label
                key={classroom.id}
                className={cn(
                  'flex items-center p-4 rounded-neo border-neo border-neo-black',
                  'cursor-pointer transition-all',
                  selectedClassroomId === classroom.id
                    ? 'bg-neo-cyan/20 shadow-hard'
                    : 'bg-neo-navy/50 hover:bg-neo-navy'
                )}
              >
                <input
                  type="radio"
                  name="classroom"
                  value={classroom.id}
                  checked={selectedClassroomId === classroom.id}
                  onChange={() => onSelectClassroom(classroom.id)}
                  className="w-5 h-5 text-neo-cyan focus:ring-neo-cyan"
                  aria-label={classroom.name}
                />
                <span className="ms-3 text-neo-white font-bold flex-1">
                  {classroom.name}
                </span>
                <span className="text-neo-white text-sm">
                  {classroom.member_count || 0} {t('education.students')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Lesson Selection */}
        <div>
          <label className="block text-neo-white font-bold mb-3">
            <BookOpen className="w-5 h-5 inline me-2 text-neo-pink" />
            {t('education.classroomGame.selectLessons')}
          </label>
          <MultiLessonSelector
            lessons={lessons}
            selectedLessonIds={selectedLessonIds}
            onSelectChange={onSelectLessons}
          />

          {selectedLessonIds.length > 0 && (
            <div className="mt-4 p-3 bg-neo-cyan/10 rounded-neo border border-neo-cyan/30">
              <p className="text-neo-white font-bold text-center">
                {t('education.classroomGame.words', { count: allPlayableWords.length })}
              </p>
            </div>
          )}
        </div>

        {/* Timer */}
        <div>
          <div id="classroom-timer-label" className="block text-neo-white font-bold mb-3">
            <Timer className="w-5 h-5 inline me-2 text-neo-cyan" />
            {t('teacher.classroom.timer.title')}
          </div>
          <div
            role="radiogroup"
            aria-labelledby="classroom-timer-label"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {TIMER_OPTIONS.map(({ minutes, labelKey }) => {
              const isSelected = timerMinutes === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onTimerChange(minutes)}
                  className={cn(
                    'px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
                    isSelected
                      ? 'bg-neo-cyan text-neo-black shadow-hard'
                      : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                  )}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Size */}
        <div>
          <div id="classroom-board-label" className="block text-neo-white font-bold mb-3">
            <Grid3x3 className="w-5 h-5 inline me-2 text-neo-lime" />
            {t('teacher.classroom.board.title')}
          </div>
          <div
            role="radiogroup"
            aria-labelledby="classroom-board-label"
            className="grid grid-cols-3 gap-3"
          >
            {BOARD_SIZES.map(({ key, labelKey }) => {
              const isSelected = boardSize === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onBoardSizeChange(key)}
                  className={cn(
                    'px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
                    isSelected
                      ? 'bg-neo-lime text-neo-black shadow-hard'
                      : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                  )}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <ClassroomModeSettings
          gameMode={gameMode}
          targetWord={targetWord}
          minWordLength={minWordLength}
          allPlayableWords={allPlayableWords}
          onGameModeChange={onGameModeChange}
          onTargetWordChange={onTargetWordChange}
          onMinWordLengthChange={onMinWordLengthChange}
        />
      </div>
    </WizardStep>
  );
}
