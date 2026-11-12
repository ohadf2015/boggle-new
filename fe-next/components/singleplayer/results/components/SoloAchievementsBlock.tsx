import PlayerArchetypeBadge from '@/components/results/PlayerArchetypeBadge';
import BonusBadgesRow from '@/components/results/BonusBadgesRow';
import { AchievementBadge } from '@/components/AchievementBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { SinglePlayerMode, SinglePlayerResultsData } from '../../SinglePlayerView';

interface Props {
  achievements: SinglePlayerResultsData['achievements'];
  mode: SinglePlayerMode;
  playerArchetype: PlayerArchetype | null;
  totalComboBonus: number;
  totalFireRoundBonus: number;
}

export function SoloAchievementsBlock({ achievements, mode, playerArchetype, totalComboBonus, totalFireRoundBonus }: Props) {
  if (!((achievements && achievements.length > 0) || totalComboBonus > 0 || totalFireRoundBonus > 0)) return null;
  return (
    <div className="space-y-2">
      {mode === 'solo-bots' && playerArchetype && (
        <div className="flex justify-center"><PlayerArchetypeBadge archetype={playerArchetype} size="md" /></div>
      )}
      <BonusBadgesRow comboBonus={totalComboBonus} fireRoundBonus={totalFireRoundBonus} />
      {achievements && achievements.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {achievements.slice(0, 8).map((ach, i) => (
            <AchievementBadge key={ach.key} achievement={ach} index={i} />
          ))}
          {achievements.length > 8 && (
            <span className="text-xs text-neo-cyan font-bold text-center w-full">+{achievements.length - 8} more</span>
          )}
        </div>
      )}
    </div>
  );
}
