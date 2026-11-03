'use client';

import { Target } from 'lucide-react';
import { useDailyMissions, type Mission } from '@/hooks/useDailyMissions';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type QuestScreen = 'hunt' | 'multiplayer';

const SHARED = ['longWord', 'wordsInGame'];
const FITS: Record<QuestScreen, { types: string[]; playModeHref: string }> = {
  hunt: { types: SHARED, playModeHref: 'word-hunt' },
  multiplayer: { types: [...SHARED, 'score', 'combo', 'mpWin', 'beatHuman'], playModeHref: 'multiplayer' },
};

/** Whether finishing a round on this screen can complete the quest (mirrors the server credit seams). */
export function questFitsScreen(mission: Mission, screen: QuestScreen): boolean {
  const rule = FITS[screen];
  if (rule.types.includes(mission.type)) return true;
  return mission.type === 'playMode' && mission.href.includes(rule.playModeHref);
}

/** One line, shown before a round: today's open quest that this round can finish. */
export function QuestGoalChip({ screen, className }: { screen: QuestScreen; className?: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { missions, loading } = useDailyMissions();

  if (!user || loading) return null;
  const goal = missions.find((m) => !m.completed && questFitsScreen(m, screen));
  if (!goal) return null;

  return (
    <span
      data-testid="quest-goal-chip"
      className={cn(
        'inline-flex items-center gap-1.5 max-w-full rounded-full border-2 border-neo-lime bg-neo-navy px-3 py-1 shadow-hard-sm',
        'font-neo-display text-xs font-bold text-neo-lime',
        className,
      )}
    >
      <Target className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="line-clamp-2">{t(goal.titleKey)}</span>
    </span>
  );
}
