/**
 * WordHuntPlayerLives
 * Shows other players' life bars as small indicators in Word Hunt mode
 */

'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface WordHuntPlayerLivesProps {
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  currentPlayer: string;
}

export function WordHuntPlayerLives({
  playerLives,
  eliminatedPlayers,
  currentPlayer,
}: WordHuntPlayerLivesProps) {
  const { t } = useLanguage();
  const otherPlayers = Object.keys(playerLives).filter(
    (p) => p !== currentPlayer,
  );

  if (otherPlayers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1" data-testid="word-hunt-player-lives">
      {otherPlayers.map((player) => {
        const life = playerLives[player] || 0;
        const isEliminated = eliminatedPlayers.includes(player);
        const percentage = Math.min(100, Math.max(0, life));

        let colorClass: string;
        if (percentage > 60) {
          colorClass = 'bg-green-500';
        } else if (percentage > 30) {
          colorClass = 'bg-yellow-500';
        } else {
          colorClass = 'bg-red-500';
        }

        return (
          <div key={player} className="flex items-center gap-2">
            <span
              className={`text-xs font-neo-body truncate w-16 ${
                isEliminated ? 'text-gray-500 line-through' : 'text-neo-white'
              }`}
            >
              {player}
            </span>
            <div className="flex-1 h-2 rounded bg-gray-800 border border-black overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isEliminated ? 'bg-gray-600' : colorClass
                }`}
                style={{ width: `${isEliminated ? 0 : percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
