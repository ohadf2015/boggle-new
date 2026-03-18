import { School, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { WizardStep } from '@/components/ui/WizardStep';
import { MultiLessonSelector } from './MultiLessonSelector';
import type { VocabularyLesson, Classroom } from '@/lib/supabase/education';

interface ClassroomSetupStepProps {
  classrooms: Classroom[];
  lessons: VocabularyLesson[];
  selectedClassroomId: string;
  selectedLessonIds: string[];
  allPlayableWords: string[];
  onSelectClassroom: (id: string) => void;
  onSelectLessons: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ClassroomSetupStep({
  classrooms,
  lessons,
  selectedClassroomId,
  selectedLessonIds,
  allPlayableWords,
  onSelectClassroom,
  onSelectLessons,
  onNext,
  onBack,
}: ClassroomSetupStepProps) {
  const { t } = useLanguage();

  return (
    <WizardStep
      currentStep={1}
      totalSteps={2}
      title={t('education.classroomGame.selectClassroomAndLessons')}
      description={t('education.classroomGame.selectClassroomAndLessonsDesc')}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={selectedLessonIds.length === 0}
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
                  aria-label={`Class ${classroom.name}`}
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
                {allPlayableWords.length} {t('education.classroomGame.words')}
              </p>
            </div>
          )}
        </div>
      </div>
    </WizardStep>
  );
}
