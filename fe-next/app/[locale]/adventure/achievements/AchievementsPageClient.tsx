/**
 * AchievementsPageClient Component
 *
 * Client-side achievements page with grid and detail modal.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AchievementGrid } from '@/components/adventure/achievements';
import { UnifiedAchievementModal } from '@/components/achievements/UnifiedAchievementModal';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import {
  ADVENTURE_ACHIEVEMENTS,
  type AdventureAchievementId,
} from '@/utils/adventureAchievementUtils';

export function AchievementsPageClient() {
  const { t, language } = useLanguage();
  const { canSeeInWorkModes, loading, user, profile } = useAuth();
  const router = useRouter();
  const { achievementCounts } = useAdventureAchievements();
  const [selectedAchievement, setSelectedAchievement] = useState<{
    achievement: typeof ADVENTURE_ACHIEVEMENTS[AdventureAchievementId];
    count: number;
  } | null>(null);

  // Same beta/admin gate as /adventure. The sub-route was public while the
  // parent was gated, so a guessable URL skipped the work-mode wall.
  const isDev = process.env.NODE_ENV === 'development';
  const resolving = loading || (!!user && !profile);
  const denied = !resolving && !canSeeInWorkModes && !isDev;
  useEffect(() => {
    if (denied) {
      router.replace(`/${language}`);
    }
  }, [denied, language, router]);

  const handleSelectAchievement = useCallback((id: AdventureAchievementId) => {
    const achievement = ADVENTURE_ACHIEVEMENTS[id];
    const count = achievementCounts[id] || 0;
    if (achievement && count > 0) {
      setSelectedAchievement({ achievement, count });
    }
  }, [achievementCounts]);

  const handleCloseModal = useCallback(() => {
    setSelectedAchievement(null);
  }, []);

  if (resolving || denied) return null;

  return (
    <div
      className={cn(
        'min-h-screen',
        'bg-neo-navy',
        'px-4 py-8 md:px-8'
      )}
    >
      <div className="max-w-6xl mx-auto">
        {/* Back Navigation */}
        <Link
          href={`/${language}/adventure`}
          className={cn(
            'inline-flex items-center gap-2',
            'text-neo-white hover:text-neo-white',
            'mb-6 transition-colors'
          )}
        >
          <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />
          {t('adventure.backToMap')}
        </Link>

        {/* Achievement Grid */}
        <AchievementGrid onSelectAchievement={handleSelectAchievement} />

        {/* Detail Modal */}
        {selectedAchievement && (
          <UnifiedAchievementModal
            type="adventure"
            achievement={selectedAchievement.achievement}
            count={selectedAchievement.count}
            isNew={false}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
}
