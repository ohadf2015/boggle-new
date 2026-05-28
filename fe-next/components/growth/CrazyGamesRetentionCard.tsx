'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadFromCloud, saveToCloud, type SaveData } from '@/utils/crazygames/cloudSave';

interface RetentionState {
  streak: number;
  isNewDay: boolean;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function buildDefaultSave(): SaveData {
  return {
    version: 2,
    adventureProgress: { worldId: 0, levelId: 0, stars: 0, completedLevels: [] },
    educationProgress: { totalXp: 0, level: 1, streak: 0, achievements: [] },
    preferences: { musicVolume: 0.8, soundVolume: 0.8, language: 'en' },
    retentionData: { lastPlayedDate: '', cgStreak: 0 },
  };
}

export const CrazyGamesRetentionCard: React.FC = () => {
  const { t } = useLanguage();
  const [state, setState] = useState<RetentionState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const saved = await loadFromCloud();
      if (cancelled) return;

      const today = todayISO();
      const yesterday = yesterdayISO();
      const existing = saved?.retentionData;
      const lastDate = existing?.lastPlayedDate ?? '';
      const currentStreak = existing?.cgStreak ?? 0;

      let newStreak: number;
      let isNewDay: boolean;

      if (lastDate === today) {
        // Already recorded for today — no write needed
        setState({ streak: currentStreak, isNewDay: false });
        return;
      } else if (lastDate === yesterday) {
        newStreak = currentStreak + 1;
        isNewDay = true;
      } else {
        newStreak = 1;
        isNewDay = true;
      }

      const base = saved ?? buildDefaultSave();
      await saveToCloud({ ...base, retentionData: { lastPlayedDate: today, cgStreak: newStreak } });

      if (!cancelled) setState({ streak: newStreak, isNewDay });
    }

    run();
    return () => { cancelled = true; };
  }, []);

  if (!state) return null;

  const messageKey =
    state.streak > 1
      ? 'crazygames.retention.keepStreak'
      : 'crazygames.retention.firstDay';

  return (
    <div
      data-testid="cg-retention-card"
      className="flex flex-col items-center gap-2 w-full rounded-neo border-neo border-black bg-neo-navy-light p-4 shadow-hard text-center"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          {state.streak > 1 ? '🔥' : '⭐'}
        </span>
        <span className="font-neo-display text-xl text-neo-orange font-bold">
          {t('crazygames.retention.streakDay', { n: state.streak })}
        </span>
        <span
          data-testid="cg-retention-streak"
          className="sr-only"
        >
          {state.streak}
        </span>
      </div>
      <p
        data-testid="cg-retention-message"
        className="font-neo-body text-sm text-neo-white"
      >
        {t(messageKey)}
      </p>
    </div>
  );
};

export default CrazyGamesRetentionCard;
