'use client';

/**
 * AchievementsSection - Display achievements in collapsible section
 *
 * Shows achievements with optional disclaimer for single player mode.
 */

import React from 'react';
import { Award } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { AchievementBadge } from '@/components/AchievementBadge';
import type { GameAchievement } from '@/components/results/types';

interface AchievementsSectionProps {
  achievements: GameAchievement[];
  title?: string;
  disclaimer?: string;
  defaultExpanded?: boolean;
}

export function AchievementsSection({
  achievements,
  title,
  disclaimer,
  defaultExpanded = true,
}: AchievementsSectionProps): React.ReactElement {
  return (
    <CollapsibleSection
      title={title}
      icon={<Award className="w-4 h-4" />}
      badge={achievements.length}
      defaultExpanded={defaultExpanded}
      variant="tertiary"
      className="shadow-hard"
    >
      <div className="flex flex-wrap gap-2">
        {achievements.map((ach, i) => (
          <AchievementBadge key={ach.key} achievement={ach} index={i} />
        ))}
      </div>
      {disclaimer && (
        <p className="text-xs text-white mt-2 italic">{disclaimer}</p>
      )}
    </CollapsibleSection>
  );
}
