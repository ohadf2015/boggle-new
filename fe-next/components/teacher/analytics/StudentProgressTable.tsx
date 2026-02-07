'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useStudentProgressMetrics } from '@/hooks/useStudentProgressMetrics';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import type { StudentProgressSummary } from '@/lib/supabase/analytics';

interface StudentProgressTableProps {
  classroomId: string;
  onStudentClick?: (studentId: string) => void;
}

type SortColumn = 'name' | 'level' | 'xp' | 'mastery' | 'accuracy' | 'streak';
type SortDirection = 'asc' | 'desc';

export function StudentProgressTable({ classroomId, onStudentClick }: StudentProgressTableProps) {
  const { t } = useLanguage();
  const { students, isLoading, error } = useStudentProgressMetrics({ classroomId });

  const [sortColumn, setSortColumn] = useState<SortColumn>('xp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedStudents = useMemo(() => {
    const sorted = [...students];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'level':
          comparison = a.currentLevel - b.currentLevel;
          break;
        case 'xp':
          comparison = a.totalXp - b.totalXp;
          break;
        case 'mastery':
          comparison = a.vocabularyMastery - b.vocabularyMastery;
          break;
        case 'accuracy':
          comparison = a.overallAccuracy - b.overallAccuracy;
          break;
        case 'streak':
          comparison = a.currentStreak - b.currentStreak;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [students, sortColumn, sortDirection]);

  const formatLastActive = (date: string | null) => {
    if (!date) return '-';

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    if (date === today) return t('education.analytics.today');
    if (date === yesterday) return t('education.analytics.yesterday');

    const daysAgo = Math.floor((now.getTime() - new Date(date).getTime()) / 86400000);
    return t('education.analytics.daysAgo', { count: daysAgo });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <PageLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neo-orange/20 border-neo border-neo-black shadow-hard p-4 rounded-neo">
        <p className="text-neo-white font-neo-body">{error.message}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-neo-navy/80 border-neo border-neo-black shadow-hard p-8 rounded-neo text-center">
        <p className="text-neo-white font-neo-body text-lg mb-2">
          {t('education.analytics.noStudents')}
        </p>
        <p className="text-neo-white/60 font-neo-body text-sm">
          {t('education.analytics.inviteStudents')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neo-navy border-neo border-neo-black shadow-hard rounded-neo overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neo-navy/80 border-b-neo border-neo-black">
              <th
                className="px-4 py-3 text-left text-xs font-neo-body uppercase text-neo-white cursor-pointer hover:bg-neo-cyan/10"
                onClick={() => handleHeaderClick('name')}
              >
                {t('education.analytics.student')}
                {sortColumn === 'name' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-neo-body uppercase text-neo-white cursor-pointer hover:bg-neo-cyan/10 hidden md:table-cell"
                onClick={() => handleHeaderClick('level')}
              >
                {t('education.analytics.level')}
                {sortColumn === 'level' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-neo-body uppercase text-neo-white cursor-pointer hover:bg-neo-cyan/10"
                onClick={() => handleHeaderClick('xp')}
              >
                XP
                {sortColumn === 'xp' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-neo-body uppercase text-neo-white cursor-pointer hover:bg-neo-cyan/10 hidden lg:table-cell"
                onClick={() => handleHeaderClick('mastery')}
              >
                {t('education.analytics.mastery')}
                {sortColumn === 'mastery' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-neo-body uppercase text-neo-white cursor-pointer hover:bg-neo-cyan/10"
                onClick={() => handleHeaderClick('accuracy')}
              >
                {t('education.analytics.accuracy')}
                {sortColumn === 'accuracy' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-neo-body uppercase text-neo-white cursor-pointer hover:bg-neo-cyan/10 hidden md:table-cell"
                onClick={() => handleHeaderClick('streak')}
              >
                {t('education.analytics.streak')}
                {sortColumn === 'streak' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-4 py-3 text-left text-xs font-neo-body uppercase text-neo-white hidden lg:table-cell">
                {t('education.analytics.lastActive')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student) => (
              <tr
                key={student.studentId}
                className={`
                  border-b border-neo-black/20 hover:bg-neo-cyan/10 cursor-pointer
                  ${student.isStruggling ? 'struggling-row bg-neo-orange/20 border-l-4 border-neo-orange' : ''}
                `}
                onClick={() => onStudentClick?.(student.studentId)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {student.avatarUrl ? (
                      <Image
                        src={student.avatarUrl}
                        alt={student.displayName}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full border-neo border-neo-black"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neo-cyan/20 border-neo border-neo-black flex items-center justify-center">
                        <span className="text-neo-white font-neo-body text-sm">
                          {student.displayName[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-neo-white font-neo-body">
                      {student.displayName}
                      {student.isStruggling && (
                        <span className="ml-2 text-xs text-neo-orange">
                          ({t('education.analytics.struggling')})
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neo-white font-neo-body hidden md:table-cell">
                  {student.currentLevel}
                </td>
                <td className="px-4 py-3 text-neo-white font-neo-body">
                  {student.totalXp}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neo-black/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neo-yellow transition-all"
                        style={{ width: `${student.vocabularyMastery}%` }}
                      />
                    </div>
                    <span className="text-neo-white font-neo-body text-sm">
                      {student.vocabularyMastery}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neo-white font-neo-body">
                  {student.overallAccuracy}%
                </td>
                <td className="px-4 py-3 text-neo-white font-neo-body hidden md:table-cell">
                  {student.currentStreak >= 3 && (
                    <span className="mr-1">🔥</span>
                  )}
                  {student.currentStreak}
                </td>
                <td className="px-4 py-3 text-neo-white/60 font-neo-body text-sm hidden lg:table-cell">
                  {formatLastActive(student.lastPracticeDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
