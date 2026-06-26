'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAssignmentCompletions } from '@/lib/supabase/education/assignments';
import type { AssignmentCompletion } from '@/lib/supabase/education/types';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';

interface StudentRosterEntry {
  student_id: string;
  display_name: string;
}

interface CompletionTrackerProps {
  assignmentId: string;
  totalStudents: number;
  studentRoster?: StudentRosterEntry[];
}

interface ExtendedCompletion extends AssignmentCompletion {
  incorrectWords?: string[];
}

interface StrugglingWord {
  word: string;
  errorCount: number;
  errorRate: number;
}

export default function CompletionTracker({
  assignmentId,
  totalStudents,
  studentRoster,
}: CompletionTrackerProps) {
  const { t } = useLanguage();
  const [completions, setCompletions] = useState<ExtendedCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStrugglingAreas, setShowStrugglingAreas] = useState(false);

  useEffect(() => {
    async function fetchCompletions() {
      setIsLoading(true);
      const { data, error } = await getAssignmentCompletions(assignmentId);

      if (!error && data) {
        setCompletions(data as ExtendedCompletion[]);
      }
      setIsLoading(false);
    }

    fetchCompletions();
  }, [assignmentId]);

  // Calculate struggling words from completion data
  const strugglingWords: StrugglingWord[] = (() => {
    const wordErrors: Record<string, number> = {};

    completions.forEach((completion) => {
      if (completion.incorrectWords) {
        completion.incorrectWords.forEach((word) => {
          wordErrors[word] = (wordErrors[word] || 0) + 1;
        });
      }
    });

    return Object.entries(wordErrors)
      .map(([word, count]) => ({
        word,
        errorCount: count,
        errorRate: completions.length > 0 ? (count / completions.length) * 100 : 0,
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 5); // Top 5
  })();

  const completionPercentage = totalStudents > 0
    ? Math.round((completions.length / totalStudents) * 100)
    : 0;

  // Sort: completed students first (by score DESC), then not-completed
  const sortedCompletions = [...completions].sort((a, b) => b.score - a.score);

  // Determine which students haven't completed the assignment
  const completedStudentIds = new Set(completions.map((c) => c.student_id));
  const nonCompletingStudents = studentRoster
    ? studentRoster.filter((s) => !completedStudentIds.has(s.student_id))
    : [];
  const anonymousNotCompleted = studentRoster
    ? 0
    : Math.max(0, totalStudents - completions.length);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-neo-body text-neo-white">
            {t('teacher.completion.overallProgress')}
          </span>
          <span className="text-sm font-bold text-neo-cyan">
            {completionPercentage}%
          </span>
        </div>
        <div className="w-full h-3 bg-neo-black/30 rounded-full overflow-hidden border border-neo-black">
          <div
            className="h-full bg-neo-cyan transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="text-xs text-neo-white mt-1">
          {completions.length} / {totalStudents} {t('teacher.completion.studentsCompleted')}
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sortedCompletions.map((completion) => (
          <div
            key={completion.id}
            className="flex items-center justify-between p-3 rounded-neo bg-neo-black/20 border border-neo-black"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-neo-body text-neo-white">
                  {completion.profiles?.display_name || t('teacher.completion.student')}
                </div>
                <div className="text-xs text-neo-white">
                  {new Date(completion.completed_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-neo-cyan font-bold">{completion.score}</div>
              <div className="text-neo-white">{completion.accuracy}%</div>
            </div>
          </div>
        ))}

        {/* Not completed students — named if roster provided, anonymous fallback */}
        {nonCompletingStudents.map((student) => (
          <div
            key={`pending-${student.student_id}`}
            className="flex items-center justify-between p-3 rounded-neo bg-neo-black/10 border border-neo-black/30"
          >
            <div className="flex items-center gap-3">
              <Circle className="w-5 h-5 text-neo-white" />
              <div className="font-neo-body text-neo-white">
                {student.display_name}
              </div>
            </div>
            <span className="text-xs text-neo-white font-neo-body">
              {t('teacher.completion.notCompleted')}
            </span>
          </div>
        ))}
        {Array.from({ length: anonymousNotCompleted }).map((_, i) => (
          <div
            key={`pending-${i}`}
            className="flex items-center justify-between p-3 rounded-neo bg-neo-black/10 border border-neo-black/30"
          >
            <div className="flex items-center gap-3">
              <Circle className="w-5 h-5 text-neo-white" />
              <div className="font-neo-body text-neo-white">
                {t('teacher.completion.notCompleted')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Struggling Areas Section */}
      {completions.length > 0 && (
        <div className="border-t border-neo-black/30 pt-4">
          <button
            type="button"
            onClick={() => setShowStrugglingAreas(!showStrugglingAreas)}
            className="w-full flex items-center justify-between p-3 rounded-neo bg-neo-orange/10 border border-neo-orange/30 hover:bg-neo-orange/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-neo-orange" />
              <span className="font-neo-body text-neo-white">
                {t('teacher.completion.strugglingAreas')}
              </span>
            </div>
            {showStrugglingAreas ? (
              <ChevronUp className="w-5 h-5 text-neo-orange" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neo-orange" />
            )}
          </button>

          {showStrugglingAreas && (
            <div className="mt-3 space-y-2">
              {strugglingWords.length === 0 ? (
                <div className="p-4 text-center text-sm text-neo-white">
                  {t('teacher.completion.noStrugglingAreas')}
                </div>
              ) : (
                strugglingWords.map((item) => (
                  <div
                    key={item.word}
                    className="flex items-center justify-between p-3 rounded-neo bg-neo-black/20"
                  >
                    <div className="flex-1">
                      <div className="font-neo-body text-neo-white font-bold">
                        {item.word}
                      </div>
                      <div className="text-xs text-neo-white mt-1">
                        {item.errorCount}/{completions.length} {t('teacher.completion.studentsMissed')}
                      </div>
                    </div>
                    <div className="w-32">
                      <div className="h-2 bg-neo-black/30 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all',
                            item.errorRate > 66 ? 'bg-red-500' :
                            item.errorRate > 33 ? 'bg-neo-orange' :
                            'bg-neo-lime'
                          )}
                          style={{ width: `${item.errorRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
