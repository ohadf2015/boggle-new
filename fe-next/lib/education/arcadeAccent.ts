// Arcade color blocks behind game art on teacher screens. Lime is left out: it belongs to the one primary button.
export const ARCADE_ACCENTS = ['cyan', 'pink', 'purple', 'yellow', 'orange'] as const;
export type ArcadeAccent = (typeof ARCADE_ACCENTS)[number];

export const ARCADE_BLOCK: Record<ArcadeAccent, string> = {
  cyan: 'bg-neo-cyan',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
  yellow: 'bg-neo-yellow',
  orange: 'bg-neo-orange',
};

export const arcadeAccentAt = (index: number): ArcadeAccent => ARCADE_ACCENTS[index % ARCADE_ACCENTS.length];
