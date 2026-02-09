'use client';

import { useState, useCallback, useMemo, Fragment } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassProgress } from '@/hooks/useStudentProgress';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/PageLoader';
import { ChevronDown, ChevronRight, Users, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentProgressView() {
  const { t } = useLanguage();
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
  const studentStats = useMemo(() => progress.map((p) => {
    const wordsAttempted = Object.keys(p.words_attempted || {}).length;
    const wordsMastered = (p.words_mastered || []).length;
    const attempts = Object.values(p.words_attempted || {}) as { attempts: number; correct: number }[];
    const totalAttempts = attempts.reduce((sum, a) => sum + a.attempts, 0);
    const totalCorrect = attempts.reduce((sum, a) => sum + a.correct, 0);
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    return {
      ...p,
      wordsAttempted,
      wordsMastered,
      accuracy,
      lastActive: p.started_at,
    };
  }), [progress]);

  // Export progress data to CSV
  const handleExportCSV = useCallback(() => {
    if (studentStats.length === 0) {
      toast.error(t('teacher.progress.noDataToExport'));
      return;
    }

    // Build CSV content
    const headers = [
      t('teacher.progress.student'),
      t('teacher.progress.wordsAttempted'),
      t('teacher.progress.wordsMastered'),
      t('teacher.progress.accuracy'),
      t('teacher.progress.lastActive'),
    ];

    const rows = studentStats.map((student) => [
      t('teacher.progress.anonymousStudent', { id: student.student_id.slice(0, 8) }),
      student.wordsAttempted,
      student.wordsMastered,
      student.accuracy.toFixed(1),
      new Date(student.lastActive).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const classroomName = selectedClassroom?.name || 'classroom';
    const lessonName = selectedLesson?.name || 'lesson';
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `${classroomName}-${lessonName}-progress-${timestamp}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('teacher.progress.exportSuccess'));
  }, [studentStats, selectedClassroom, selectedLesson, t]);

  if (loadingClassrooms || loadingLessons) {
    return (
      <div className="flex justify-center items-center py-12">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and export */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
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
            <option value="">{t('teacher.progress.allClassrooms')}</option>
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
            <option value="">{t('teacher.progress.allLessons')}</option>
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

        {/* Export Button */}
        <Button
          onClick={handleExportCSV}
          disabled={studentStats.length === 0 || !selectedClassroomId || !selectedLessonId}
          className={cn(
            'flex items-center gap-2 font-neo-body font-bold whitespace-nowrap',
            'bg-neo-lime text-neo-black border-neo border-neo-black',
            'shadow-hard hover:shadow-hard-lg',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Download className="w-4 h-4" />
          {t('teacher.progress.exportCSV')}
        </Button>
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
          <PageLoader size="md" text={t('common.loading')} />
        </div>
      ) : studentStats.length === 0 ? (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-neo-display text-neo-white mb-2">
              {t('teacher.progress.noData')}
            </h3>
            <p className="text-slate-400">{t('teacher.progress.noProgressYet')}</p>
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
                    const wordEntries = Object.entries(student.words_attempted || {});
                    const masteredSet = new Set(student.words_mastered || []);
                    return (
                      <Fragment key={student.id}>
                        <tr
                          className="border-b border-neo-black/30 hover:bg-neo-black/20 transition-colors cursor-pointer"
                          onClick={() =>
                            setExpandedStudentId(isExpanded ? null : student.student_id)
                          }
                        >
                          <td className="px-4 py-3 text-neo-white font-neo-body">
                            {t('teacher.progress.anonymousStudent', { id: student.student_id.slice(0, 8) })}
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
                            <span className="text-neo-cyan">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-neo-black/30">
                            <td colSpan={6} className="px-6 py-4">
                              {wordEntries.length === 0 ? (
                                <p className="text-slate-400 text-sm italic">
                                  {t('teacher.progress.noWordsYet')}
                                </p>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-slate-400">
                                      <th className="text-left pb-2 font-medium">
                                        {t('teacher.progress.breakdownWord')}
                                      </th>
                                      <th className="text-center pb-2 font-medium">
                                        {t('teacher.progress.breakdownAttempts')}
                                      </th>
                                      <th className="text-center pb-2 font-medium">
                                        {t('teacher.progress.breakdownCorrect')}
                                      </th>
                                      <th className="text-center pb-2 font-medium">
                                        {t('teacher.progress.accuracy')}
                                      </th>
                                      <th className="text-right pb-2 font-medium">
                                        {t('teacher.progress.wordsMastered')}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {wordEntries.map(([word, attempt]) => {
                                      const data = attempt as { attempts: number; correct: number };
                                      const wordAccuracy = data.attempts > 0
                                        ? Math.round((data.correct / data.attempts) * 100)
                                        : 0;
                                      const isMastered = masteredSet.has(word);
                                      return (
                                        <tr key={word} className="border-t border-neo-black/20">
                                          <td className="py-2 text-neo-white font-mono">
                                            {word}
                                          </td>
                                          <td className="py-2 text-center text-neo-white">
                                            {data.attempts}
                                          </td>
                                          <td className="py-2 text-center text-neo-white">
                                            {data.correct}
                                          </td>
                                          <td className="py-2 text-center">
                                            <span className={cn(
                                              'text-sm',
                                              wordAccuracy >= 80 ? 'text-neo-cyan' :
                                              wordAccuracy >= 60 ? 'text-neo-yellow' : 'text-neo-pink'
                                            )}>
                                              {wordAccuracy}%
                                            </span>
                                          </td>
                                          <td className="py-2 text-right">
                                            <span className={cn(
                                              'px-2 py-0.5 rounded text-xs font-bold',
                                              isMastered
                                                ? 'bg-neo-cyan/20 text-neo-cyan'
                                                : 'bg-neo-yellow/20 text-neo-yellow'
                                            )}>
                                              {isMastered
                                                ? t('teacher.progress.statusMastered')
                                                : t('teacher.progress.statusLearning')}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
