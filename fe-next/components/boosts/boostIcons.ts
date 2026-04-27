import { Lightbulb, Sparkles, Zap, Snowflake, type LucideIcon } from 'lucide-react';
import type { BoostType } from '@/shared/types/boosts';

export interface BoostIconStyle {
  Icon: LucideIcon;
  bg: string;
  fg: string;
}

export const BOOST_ICONS: Record<BoostType, BoostIconStyle> = {
  hint: { Icon: Lightbulb, bg: 'bg-neo-cyan', fg: 'text-neo-navy' },
  scoreMultiplier: { Icon: Sparkles, bg: 'bg-neo-lime', fg: 'text-neo-navy' },
  firstWordBonus: { Icon: Zap, bg: 'bg-neo-yellow', fg: 'text-neo-navy' },
  freezeTime: { Icon: Snowflake, bg: 'bg-neo-cyan-light', fg: 'text-neo-navy' },
};
