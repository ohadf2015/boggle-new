'use client';

import { useState } from 'react';
import { useVocabularyMastery } from '@/hooks/useVocabularyMastery';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MasteryLevel } from '@/lib/supabase/analytics';

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
  const getMasteryColor = (masteryLevel: MasteryLevel): string => {
    switch (masteryLevel) {
      case 'mastered':
        return 'bg-neo-cyan';
      case 'practicing':
        return 'bg-neo-lime';
      case 'struggling':
        return 'bg-neo-orange';
      case 'not-started':
        return 'bg-neo-navy/50';
      default:
        return 'bg-neo-navy/50';
    }
  };

  // Find cell data
  const getCellData = (studentId: string, word: string) => {
    return heatmapData.cells.find(
      cell => cell.studentId === studentId && cell.word === word
    );
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 p-3 bg-neo-navy/30 rounded-neo border-neo border-neo-white/20">
        <span className="text-neo-white font-neo-display text-sm">
          {t('education.analytics.masteryLevels')}:
        </span>
        <div className="flex gap-3">
          {[
            { key: 'mastered', color: 'bg-neo-cyan' },
            { key: 'practicing', color: 'bg-neo-lime' },
            { key: 'struggling', color: 'bg-neo-orange' },
            { key: 'notStarted', color: 'bg-neo-navy/50' },
          ].map(level => (
            <div key={level.key} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 ${level.color} border-neo border-black rounded-sm`}
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

            {/* Data Rows - One row per word */}
            {heatmapData.words.map(word => (
              <div key={word} className="flex">
                {/* Word label (sticky) */}
                <div className="w-32 shrink-0 p-2 border-neo border-neo-white/20 bg-neo-navy flex items-center">
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
  );
}
