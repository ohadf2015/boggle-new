/**
 * AchievementsPageClient Component
 *
 * Client-side achievements page with grid and detail modal.
 * Public: guests see the adventure guest gate, signed-in players the grid.
 */

'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AchievementGrid } from '@/components/adventure/achievements';
import { UnifiedAchievementModal } from '@/components/achievements/UnifiedAchievementModal';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { AdventureGuestGate } from '@/components/adventure/AdventureGuestGate';
import {
  ADVENTURE_ACHIEVEMENTS,
  type AdventureAchievementId,
} from '@/utils/adventureAchievementUtils';

export function AchievementsPageClient() {
  const { t, language } = useLanguage();
  const { loading, user, profile, isAuthenticated } = useAuth();
  const { achievementCounts } = useAdventureAchievements();
  const [selectedAchievement, setSelectedAchievement] = useState<{
    achievement: typeof ADVENTURE_ACHIEVEMENTS[AdventureAchievementId];
    count: number;
  } | null>(null);

  // A session user is enough; the profile row can land later (or fail).
  const signedIn = isAuthenticated || !!user;
  // Hold until auth resolves so a signed-in player never flashes the guest gate.
  const isResolving = loading || (!!user && !profile);

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

  if (isResolving) return null;

  // Show guest gate for unauthenticated users
  if (!signedIn) {
    return <AdventureGuestGate surface="achievements" />;
  }

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
