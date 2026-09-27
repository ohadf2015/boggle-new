import { Bomb, CircleDot, Search, Sword, type LucideIcon } from 'lucide-react';

export interface ArenaModeStyle {
  icon: LucideIcon;
  /** Row accent stripe (logical start border). */
  stripe: string;
  /** Icon tile fill. */
  tile: string;
  text: string;
  labelKey: string;
}

const MODES: Record<string, ArenaModeStyle> = {
  classic: { icon: Sword, stripe: 'border-s-neo-cyan', tile: 'bg-neo-cyan', text: 'text-neo-cyan', labelKey: 'multiplayerFlow.roomList.gameModes.classic' },
  blast: { icon: Bomb, stripe: 'border-s-neo-pink', tile: 'bg-neo-pink', text: 'text-neo-pink', labelKey: 'multiplayerFlow.roomList.gameModes.blast' },
  'word-hunt': { icon: Search, stripe: 'border-s-neo-purple', tile: 'bg-neo-purple', text: 'text-neo-purple', labelKey: 'multiplayerFlow.roomList.gameModes.wordHunt' },
  'wheel-rush': { icon: CircleDot, stripe: 'border-s-neo-lime', tile: 'bg-neo-lime', text: 'text-neo-lime', labelKey: 'multiplayerFlow.roomList.gameModes.wheelRush' },
};

/** An unknown mode looks like classic — same entry, not a copy of it. */
export function arenaModeStyle(mode: string | undefined): ArenaModeStyle {
  return MODES[mode || ''] || MODES.classic;
}
