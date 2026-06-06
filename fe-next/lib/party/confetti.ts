/**
 * confetti — palette for the TV celebration burst (PartyConfettiBurst).
 *
 * Neo-brutalist "Jackbox" energy: hard, electric colors (NO pastels, NO blur).
 * Colors are hex ints for PixiJS `.fill()`. The chosen mode accent is weighted
 * heaviest so the burst reads as that game's color, with a few electric
 * supporters mixed in for party chaos.
 */

const ACCENT_HEX: Record<string, number> = {
  'neo-lime': 0xbfff00,
  'neo-pink': 0xff1493,
  'neo-cyan': 0x00ffff,
  'neo-purple': 0x8b5cf6,
  'neo-yellow': 0xffe135,
};

// Celebration supporters — cream + gold read as "confetti/streamer" regardless
// of the mode accent.
const SUPPORT = [0xfffef0, 0xffe135];

export function confettiColors(accent?: string): number[] {
  const lead = ACCENT_HEX[accent ?? ''] ?? ACCENT_HEX['neo-lime'];
  const others = Object.values(ACCENT_HEX).filter((c) => c !== lead).slice(0, 3);
  // lead ×3 so it dominates the mix; supporters de-duplicated against the lead.
  return [lead, lead, lead, ...others, ...SUPPORT.filter((c) => c !== lead)];
}
