import { Anchor, ArrowDownToLine, Coins, Construction, MoveHorizontal, Shuffle, type LucideIcon } from 'lucide-react';
import type { RewardId } from '@/lib/wordTowerV2/rewards';
import type { Tone } from '@/lib/wordTowerV2/celebrations';

/** One icon per crate — shared by the HUD effect chips and the crate banner. */
export const REWARD_ICON: Record<RewardId, LucideIcon> = {
  steady: Anchor,
  plumb: ArrowDownToLine,
  wide: MoveHorizontal,
  rebar: Construction,
  scramble: Shuffle,
  jackpot: Coins,
};

/** Complete literal class strings (Tailwind only emits what it can see verbatim). */
export const TONE_CLASS: Record<Tone, string> = {
  lime: 'bg-neo-lime text-neo-navy',
  cyan: 'bg-neo-cyan text-neo-navy',
  yellow: 'bg-neo-yellow text-neo-navy',
  red: 'bg-neo-red text-neo-navy',
  pink: 'bg-neo-pink text-neo-navy',
  purple: 'bg-neo-purple text-neo-navy',
  orange: 'bg-neo-orange text-neo-navy',
};
