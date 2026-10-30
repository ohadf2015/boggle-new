'use client';

import { useState } from 'react';
import { useVocabularyMastery } from '@/hooks/useVocabularyMastery';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MasteryLevel } from '@/lib/supabase/analytics';
import { useFitPageSize } from '@/components/teacher/lesson-creation/library/useFitPageSize';

const ROW_H = 40;
const PAGER_RESERVE = 112;
const PAGER_BUTTON = 'min-h-10 rounded-neo border-2 border-neo-cream/60 px-3 text-sm font-bold text-neo-cream hover:border-neo-cream disabled:opacity-40';
const LEVEL_FILL: Record<string, string> = {
  mastered: 'bg-neo-cream',
  practicing: 'bg-neo-cream/45',
  struggling: 'bg-neo-pink',
  notStarted: 'bg-neo-navy/50',
};

interface VocabularyHeatmapProps {
  classroomId: string;
  lessonId?: string;
  onCellClick?: (studentId: string, word: string) => void;
}

/**
 * VocabularyHeatmap - Student × Word mastery grid
 *
 * Displays a color-coded grid showing which students have mastered,
 * are practicing, are struggling with, or have not started each word.
 */
export function VocabularyHeatmap({
  classroomId,
  lessonId,
  onCellClick,
}: VocabularyHeatmapProps) {
  const { t } = useLanguage();
  const { heatmapData, isLoading, error } = useVocabularyMastery({
    classroomId,
    lessonId,
  });

  const [hoveredCell, setHoveredCell] = useState<{
    studentId: string;
    word: string;
  } | null>(null);
  const [rowsRef, pageSize] = useFitPageSize(ROW_H, PAGER_RESERVE, 10);
  const [page, setPage] = useState(0);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neo-white">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-neo-orange/20 border-neo border-neo-orange text-neo-white rounded-neo">
        {error.message}
      </div>
    );
  }

  // Empty state
  if (!heatmapData || heatmapData.students.length === 0 || heatmapData.words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-neo-white text-lg font-neo-display mb-2">
          {t('education.analytics.noVocabularyData')}
        </div>
        <div className="text-neo-white">
          {t('education.analytics.practiceToSee')}
        </div>
      </div>
    );
  }

  // Helper function to get cell background color based on mastery level
  const getMasteryColor = (masteryLevel: MasteryLevel): string =>
    LEVEL_FILL[masteryLevel === 'not-started' ? 'notStarted' : masteryLevel] ?? LEVEL_FILL.notStarted;
  const pageCount = Math.max(1, Math.ceil(heatmapData.words.length / Math.max(1, pageSize)));
  const shownPage = Math.min(page, pageCount - 1);
  const pageWords = heatmapData.words.slice(shownPage * pageSize, (shownPage + 1) * pageSize);

  const getCellData = (studentId: string, word: string) => {
    return heatmapData.cells.find(
      cell => cell.studentId === studentId && cell.word === word
    );
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 p-3 bg-neo-navy/30 rounded-neo border-neo border-neo-white/40">
        <span className="text-neo-white font-neo-display text-sm">
          {t('education.analytics.masteryLevels')}:
        </span>
        <div className="flex gap-3">
          {['mastered', 'practicing', 'struggling', 'notStarted'].map((key) => ({ key, color: LEVEL_FILL[key] })).map(level => (
            <div key={level.key} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 ${level.color} border-2 border-neo-cream/40 rounded-sm`}
              />
              <span className="text-neo-white text-sm">
                {t(`education.analytics.${level.key}`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="border-neo border-neo-white/20 rounded-neo overflow-hidden">
            {/* Header Row - Student Names */}
            <div className="flex bg-neo-navy">
              {/* Corner cell */}
              <div className="w-32 shrink-0 p-2 border-neo border-neo-white/20" />
              {/* Student name cells */}
              {heatmapData.students.map(student => (
                <div
                  key={student.id}
                  className="w-24 shrink-0 p-2 border-neo border-neo-white/20 text-center"
                >
                  <span className="text-neo-white text-sm font-neo-display truncate block">
                    {student.name}
                  </span>
                </div>
              ))}
            </div>

            <div ref={rowsRef}>
            {pageWords.map(word => (
              <div key={word} className="flex">
                {/* Word label (sticky) */}
                <div className="w-32 shrink-0 p-2 border-neo border-neo-white/40 bg-neo-navy flex items-center">
                  <span className="text-neo-white text-sm font-neo-body truncate">
                    {word}
                  </span>
                </div>

                {/* Cells for each student */}
                {heatmapData.students.map(student => {
                  const cellData = getCellData(student.id, word);
                  const isHovered =
                    hoveredCell?.studentId === student.id &&
                    hoveredCell?.word === word;

                  return (
                    <div
                      key={`${student.id}-${word}`}
                      data-cell="true"
                      data-mastery={cellData?.masteryLevel}
                      className={`
                        w-24 shrink-0 p-2 border-neo border-neo-white/20
                        ${getMasteryColor(cellData?.masteryLevel || 'not-started')}
                        ${isHovered ? 'shadow-hard-sm' : ''}
                        cursor-pointer transition-shadow
                        relative
                      `}
                      onMouseEnter={() =>
                        setHoveredCell({ studentId: student.id, word })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onCellClick?.(student.id, word)}
                    >
                      {/* Tooltip on hover */}
                      {isHovered && cellData && (
                        <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-black text-white text-xs rounded whitespace-nowrap">
                          {`${cellData.studentName}: ${cellData.accuracy}% on "${cellData.word}"`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
      {pageCount > 1 && (
        <nav data-testid="heatmap-pager" aria-label={t('eduLibrary.pager.label')} className="flex items-center justify-center gap-3">
          <button type="button" disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)} className={PAGER_BUTTON}>
            {t('eduLibrary.pager.prev')}
          </button>
          <span className="text-sm font-bold text-neo-cream/80">{t('eduLibrary.pager.status', { page: shownPage + 1, total: pageCount })}</span>
          <button type="button" disabled={shownPage >= pageCount - 1} onClick={() => setPage(shownPage + 1)} className={PAGER_BUTTON}>
            {t('eduLibrary.pager.next')}
          </button>
        </nav>
      )}
    </div>
  );
}
