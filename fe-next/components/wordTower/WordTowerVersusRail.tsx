'use client';

import { Bomb, Crown } from 'lucide-react';
import type { VersusStanding } from '@/lib/wordTower/versusMatch';
import { WORD_TOWER_BOMB_LEAD_GATE_M } from '@/shared/constants/wordTowerConstants';

export interface WordTowerVersusRailProps {
  standings: VersusStanding[];
  selfId: string;
  /** Your banked bombs (from your own tower's charge). */
  banked: number;
  /** Your current height — gates which rivals you can bomb. */
  yourHeightM: number;
  onBomb: (targetId: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Live rival rail: heights + biome + a bomb button when you lead far enough. */
export function WordTowerVersusRail({ standings, selfId, banked, yourHeightM, onBomb, t }: WordTowerVersusRailProps) {
  return (
    <ul className="pointer-events-auto flex flex-col gap-1.5">
      {standings.map((s) => {
        const isYou = s.playerId === selfId;
        const canBomb = !isYou && banked > 0 && yourHeightM - s.heightM >= WORD_TOWER_BOMB_LEAD_GATE_M;
        return (
          <li
            key={s.playerId}
            className={`flex items-center justify-between gap-2 rounded-neo border-neo border-black px-2 py-1.5 shadow-hard-sm ${
              isYou ? 'bg-neo-lime text-black' : 'bg-neo-navy-light/90 text-neo-white'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              {s.rank === 1 && <Crown className="h-3.5 w-3.5 text-neo-yellow" />}
              <span className="truncate font-neo-body text-xs font-bold">{s.username}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-neo-display text-sm font-bold tabular-nums">{Math.round(s.heightM)}m</span>
              {!isYou && (
                <button
                  type="button"
                  disabled={!canBomb}
                  onClick={() => onBomb(s.playerId)}
                  aria-label={t('wordTower.versus.bomb', { name: s.username })}
                  className="rounded border-neo border-black bg-neo-pink p-1 text-neo-white shadow-hard-sm disabled:opacity-30"
                >
                  <Bomb className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
