import { School, BookOpen, LayoutGrid, Search, Zap, RotateCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { WizardStep } from '@/components/ui/WizardStep';
import { MultiLessonSelector } from './MultiLessonSelector';
import type { VocabularyLesson, Classroom } from '@/lib/supabase/education';
import type { GameMode } from '@/shared/types/game';

// Translation keys are camelCase but canonical GameMode wire values are kebab.
const MODE_KEY_MAP: Record<GameMode, string> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
};

const GAME_MODES: { key: GameMode; icon: typeof LayoutGrid; color: string }[] = [
  { key: 'classic', icon: LayoutGrid, color: 'neo-cyan' },
  { key: 'word-hunt', icon: Search, color: 'neo-lime' },
  { key: 'blast', icon: Zap, color: 'neo-pink' },
  { key: 'wheel-rush', icon: RotateCw, color: 'neo-purple' },
];

interface ClassroomSetupStepProps {
  classrooms: Classroom[];
  lessons: VocabularyLesson[];
  selectedClassroomId: string;
  selectedLessonIds: string[];
  allPlayableWords: string[];
  gameMode: GameMode;
  isStarting: boolean;
  onSelectClassroom: (id: string) => void;
  onSelectLessons: (ids: string[]) => void;
  onGameModeChange: (mode: GameMode) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ClassroomSetupStep({
  classrooms,
  lessons,
  selectedClassroomId,
  selectedLessonIds,
  allPlayableWords,
  gameMode,
  isStarting,
  onSelectClassroom,
  onSelectLessons,
  onGameModeChange,
  onNext,
  onBack,
}: ClassroomSetupStepProps) {
  const { t } = useLanguage();

  return (
    <WizardStep
      currentStep={1}
      totalSteps={1}
      title={t('education.classroomGame.selectClassroomAndLessons')}
      description={t('education.classroomGame.selectClassroomAndLessonsDesc')}
      onNext={onNext}
      onBack={onBack}
      nextLabel={t('education.classroomGame.startGame')}
      nextDisabled={selectedLessonIds.length === 0 || !selectedClassroomId}
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
                <span className="text-neo-white/70 text-sm">
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

        {/* Game Mode */}
        <div>
          <label className="block text-neo-white font-bold mb-3">
            {t('teacher.classroom.gameModes.title')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {GAME_MODES.map(({ key, icon: Icon, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => onGameModeChange(key)}
                className={cn(
                  'flex flex-col items-center gap-2 px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all',
                  gameMode === key
                    ? `bg-${color} text-neo-black shadow-hard`
                    : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm">{t(`teacher.classroom.gameModes.${MODE_KEY_MAP[key]}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </WizardStep>
  );
}
