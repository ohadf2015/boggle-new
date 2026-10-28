import { Bomb, Coins, Crown, Gem, Sparkles, Waves, type LucideIcon } from 'lucide-react';
import type { MascotKey } from '@/components/blast/legacy/utils/blastMascot';
import type { BlastWaveTheme, BlastWaveThemeId } from '@/components/blast/legacy/utils/blastWaveConfig';

export { getWaveTheme } from '@/components/blast/legacy/utils/blastWaveConfig';
export type { BlastWaveTheme } from '@/components/blast/legacy/utils/blastWaveConfig';

export const THEME_ICON: Record<BlastWaveThemeId, LucideIcon> = {
  warmUp: Sparkles,
  bombSquad: Bomb,
  coinRush: Coins,
  diamondHunt: Gem,
  boss: Crown,
  cascadeCarnival: Waves,
};

export const THEME_MASCOT: Record<BlastWaveThemeId, MascotKey> = {
  warmUp: 'neutral',
  bombSquad: 'hyped',
  coinRush: 'sneaky',
  diamondHunt: 'sneaky',
  boss: 'sweating',
  cascadeCarnival: 'celebrating',
};

/** CSS color for a theme accent, resolved from the neo palette variables. */
export function accentColor(theme: Pick<BlastWaveTheme, 'accentToken'>): string {
  return `var(--${theme.accentToken})`;
}
