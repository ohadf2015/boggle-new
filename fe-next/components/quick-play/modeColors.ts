import type { QuickMode } from './types';

// ponytail: local color map — the two "canonical" maps (MODE_ACTIVE_COLORS,
// BattleModeCard families) disagree and both reuse colors across these 4 modes;
// quick play needs 4 visually distinct families, shared by the wheel (picker)
// and results (gauge/pill) so the color identity carries across the round.
// Literal hex for SVG stroke / box-shadow — CSS vars are unreliable on SVG
// presentation attributes and made the lightning bolt effectively invisible.
export const NODE_COLORS: Record<QuickMode, { bg: string; ring: string; text: string; tether: string; hex: string }> = {
  classic: { bg: 'bg-neo-lime', ring: 'ring-neo-lime-light', text: 'text-neo-lime', tether: 'bg-neo-lime', hex: '#bfff00' },
  blast: { bg: 'bg-neo-pink', ring: 'ring-neo-pink-light', text: 'text-neo-pink', tether: 'bg-neo-pink', hex: '#ff4d9a' },
  'word-hunt': { bg: 'bg-neo-cyan', ring: 'ring-neo-cyan-light', text: 'text-neo-cyan', tether: 'bg-neo-cyan', hex: '#22d3ee' },
  'wheel-rush': { bg: 'bg-neo-purple', ring: 'ring-neo-purple-light', text: 'text-neo-purple', tether: 'bg-neo-purple', hex: '#c084fc' },
};
