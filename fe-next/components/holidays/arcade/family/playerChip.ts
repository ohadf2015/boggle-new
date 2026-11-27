import type { Player } from '@/lib/holidays/arcade/kit/passPlay';

export const PLAYER_BG: Record<Player['color'], string> = {
  'neo-lime': 'bg-neo-lime',
  'neo-pink': 'bg-neo-pink',
  'neo-cyan': 'bg-neo-cyan',
  'neo-orange': 'bg-neo-orange',
};

export const playerName = (t: (k: string, v?: Record<string, string | number>) => string, p: Pick<Player, 'name'>, index: number) =>
  p.name || t('holiday.arcade.family.playerN', { n: index + 1 });
