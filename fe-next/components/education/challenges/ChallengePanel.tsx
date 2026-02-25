'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DailyChallengeCard } from './DailyChallengeCard';
import { WeeklyChallengeCard } from './WeeklyChallengeCard';
import type { DailyChallengeRow, WeeklyQuestRow } from '@/lib/supabase/education/types';
import { PageLoader } from '@/components/ui/PageLoader';

interface ChallengePanelProps {
  playerId: string;
  className?: string;
}

export function ChallengePanel({ playerId, className = '' }: ChallengePanelProps) {
  const { t } = useLanguage();
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengeRow[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChallenges = async () => {
    setLoading(true);
    const [dailyRes, weeklyRes] = await Promise.all([
      fetch('/api/education/challenges/daily'),
      fetch('/api/education/challenges/weekly'),
    ]);
    const [dailyJson, weeklyJson] = await Promise.all([
      dailyRes.json(),
      weeklyRes.json(),
    ]);
    if (dailyRes.ok && dailyJson.challenges) {
      setDailyChallenges(dailyJson.challenges);
    }
    if (weeklyRes.ok && weeklyJson.quests) {
      setWeeklyQuests(weeklyJson.quests);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadChallenges();
  }, [playerId]);

  async function handleClaimChallenge(challengeId: string) {
    await fetch('/api/education/challenges/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId }),
    });
    loadChallenges();
  }

  async function handleClaimQuest(questId: string) {
    await fetch('/api/education/challenges/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId }),
    });
    loadChallenges();
  }

  if (loading) return <PageLoader text={t('challenges.loading')} size="lg" nested />;

  const hasContent = dailyChallenges.length > 0 || weeklyQuests.length > 0;

  return (
    <div className={`space-y-6 ${className}`} data-testid="challenge-panel">
      {!hasContent && (
        <div className="text-center text-neo-white/60 py-8">
          {t('challenges.noChallenges')}
        </div>
      )}

      {dailyChallenges.length > 0 && (
        <div>
          <h2 className="font-neo-display text-2xl text-white mb-4 flex items-center gap-2">
            ☀️ {t('challenges.daily.title')}
          </h2>
          <div className="space-y-3">
            {dailyChallenges.map((challenge) => (
              <DailyChallengeCard
                key={challenge.id}
                challenge={challenge}
                onClaim={handleClaimChallenge}
              />
            ))}
          </div>
        </div>
      )}

      {weeklyQuests.length > 0 && (
        <div>
          <div className="h-px bg-neo-navy my-6" />
          <h2 className="font-neo-display text-2xl text-white mb-4 flex items-center gap-2">
            📅 {t('challenges.weekly.title')}
          </h2>
          <div className="space-y-3">
            {weeklyQuests.map((quest) => (
              <WeeklyChallengeCard
                key={quest.id}
                quest={quest}
                onClaim={handleClaimQuest}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
