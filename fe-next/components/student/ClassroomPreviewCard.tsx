'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ClassroomPreviewCardProps {
  /** Classroom name, or the teacher's name when confirming a live game. */
  name: string;
  /**
   * Which code the student typed. A live game means "your class is playing right now and
   * you are about to walk into it" — a materially different promise from "you will be added
   * to this roster", and the student needs to know which one they are getting.
   */
  kind?: 'classroom' | 'game';
  /** Show loading state */
  isLoading?: boolean;
}

/**
 * ClassroomPreviewCard - Confirmation card shown before join
 *
 * Displays classroom name and confirms student is joining the correct class.
 * Appears after successful code lookup.
 */
const ClassroomPreviewCard: React.FC<ClassroomPreviewCardProps> = ({
  name,
  kind = 'classroom',
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const isLiveGame = kind === 'game';

  if (isLoading) {
    return (
      <Card className="border-3 border-neo-cyan/50 shadow-hard bg-neo-navy/50 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-neo-cyan/30 rounded-full animate-pulse" />
            <div className="h-4 bg-neo-cyan/30 rounded w-40 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-3 shadow-hard mb-4 bg-neo-navy",
      isLiveGame ? "border-neo-pink" : "border-neo-lime"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className={cn(
            "w-5 h-5 flex-shrink-0 mt-0.5",
            isLiveGame ? "text-neo-pink" : "text-neo-lime"
          )} />
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-xs font-bold uppercase mb-1",
              isLiveGame ? "text-neo-pink" : "text-neo-lime"
            )}>
              {t(isLiveGame
                ? 'education.student.join.preview.gameLabel'
                : 'education.student.join.preview.label')}
            </p>
            <p className="text-sm font-bold text-neo-white break-words">
              {name}
            </p>
            <p className="text-xs text-neo-white/70 mt-1">
              {t(isLiveGame
                ? 'education.student.join.preview.gameConfirm'
                : 'education.student.join.preview.confirm')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassroomPreviewCard;
