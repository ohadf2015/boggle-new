'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassProgress } from '@/hooks/useStudentProgress';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';

export default function StudentProgressView() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { classrooms, isLoading: loadingClassrooms } = useClassrooms();
  const { lessons, isLoading: loadingLessons } = useLessons();

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const { progress, isLoading: loadingProgress } = useClassProgress(
    selectedClassroomId || undefined,
    selectedLessonId
  );

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId);
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  // Calculate aggregated stats for each student
  const studentStats = progress.map((p) => {
    const wordsAttempted = Object.keys(p.words_attempted || {}).length;
    const wordsMastered = (p.words_mastered || []).length;
    const totalAttempts = Object.values(p.words_attempted || {}).reduce(
      (sum, attempt: any) => sum + attempt.attempts,
      0
    );
    const totalCorrect = Object.values(p.words_attempted || {}).reduce(
      (sum, attempt: any) => sum + attempt.correct,
      0
    );
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    return {
      ...p,
      wordsAttempted,
      wordsMastered,
      accuracy,
      lastActive: p.started_at, // TODO: use actual last_active from progress tracking
    };
  });

  if (loadingClassrooms || loadingLessons) {
    return (
      <div className="flex justify-center items-center py-12">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-neo-body text-neo-white mb-2">
            {t('teacher.dashboard.classrooms')}
          </label>
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className={cn(
              'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
              'text-neo-white font-neo-body shadow-hard-sm',
              'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
            )}
          >
            <option value="">All Classrooms</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-neo-body text-neo-white mb-2">
            {t('teacher.dashboard.lessons')}
          </label>
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className={cn(
              'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
              'text-neo-white font-neo-body shadow-hard-sm',
              'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
            )}
          >
            <option value="">All Lessons</option>
            {lessons
              .filter((l) => !selectedClassroomId || l.classroom_id === selectedClassroomId)
              .map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Progress Table */}
      {!selectedClassroomId || !selectedLessonId ? (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-neo-display text-neo-white mb-2">
              {t('teacher.progress.noData')}
            </h3>
            <p className="text-slate-400">{t('teacher.progress.assignLessons')}</p>
          </CardContent>
        </Card>
      ) : loadingProgress ? (
        <div className="flex justify-center items-center py-12">
          <NeoLoader variant="mascot-letters" size="md" text={t('common.loading')} />
        </div>
      ) : studentStats.length === 0 ? (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-neo-display text-neo-white mb-2">
              {t('teacher.progress.noData')}
            </h3>
            <p className="text-slate-400">No student progress for this lesson yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neo-black/50 border-b-2 border-neo-cyan">
                  <tr>
                    <th className="text-left px-4 py-3 text-neo-cyan font-neo-body font-bold">
                      {t('teacher.progress.student')}
                    </th>
                    <th className="text-center px-4 py-3 text-neo-cyan font-neo-body font-bold">
                      {t('teacher.progress.wordsAttempted')}
                    </th>
                    <th className="text-center px-4 py-3 text-neo-cyan font-neo-body font-bold">
                      {t('teacher.progress.wordsMastered')}
                    </th>
                    <th className="text-center px-4 py-3 text-neo-cyan font-neo-body font-bold">
                      {t('teacher.progress.accuracy')}
                    </th>
                    <th className="text-left px-4 py-3 text-neo-cyan font-neo-body font-bold">
                      {t('teacher.progress.lastActive')}
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((student) => {
                    const isExpanded = expandedStudentId === student.student_id;
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-neo-black/30 hover:bg-neo-black/20 transition-colors"
                      >
                        <td className="px-4 py-3 text-neo-white font-neo-body">
                          Student {student.student_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-center text-neo-white">
                          {student.wordsAttempted}
                        </td>
                        <td className="px-4 py-3 text-center text-neo-white">
                          {student.wordsMastered}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'px-2 py-1 rounded font-bold text-sm',
                              student.accuracy >= 80
                                ? 'bg-neo-cyan/20 text-neo-cyan'
                                : student.accuracy >= 60
                                ? 'bg-neo-yellow/20 text-neo-yellow'
                                : 'bg-neo-pink/20 text-neo-pink'
                            )}
                          >
                            {student.accuracy.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">
                          {new Date(student.lastActive).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              setExpandedStudentId(isExpanded ? null : student.student_id)
                            }
                            className="text-neo-cyan hover:text-neo-white transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
