// ─── Tile Color Themes ───────────────────────────────────────────────
// Visual identity for each tile type. Used by TileRenderer.

export interface TileTheme {
  bg: number;
  text: number;
  selectedBg: number;
  selectedText: number;
  borderWidth: number;
  borderColor: number;
}

/** Emoji indicators for special tile types */
export const TILE_INDICATORS: Record<string, string> = {
  gold: '✦',
  bomb: '💣',
  lightning: '⚡',
  prism: '🔷',
  rainbow: '🌈',
  ice: '❄',
  frozen: '🧊',
  gem: '💎',
  mirror: '🪞',
  magnet: '🌀',
  diamond: '💠',
};

export const DEFAULT_THEMES: Record<string, TileTheme> = {
  standard: {
    bg: 0xfff5e6, text: 0x1a1a2e,
    selectedBg: 0xccffff, selectedText: 0x1a1a2e,
    borderWidth: 3, borderColor: 0x2a2a3e,
  },
  gold: {
    bg: 0xffcc00, text: 0x1a1a2e,
    selectedBg: 0xffdd44, selectedText: 0x1a1a2e,
    borderWidth: 3, borderColor: 0x886600,
  },
  silver: {
    bg: 0xc8c8d8, text: 0x1a1a2e,
    selectedBg: 0xe0e0f0, selectedText: 0x1a1a2e,
    borderWidth: 3, borderColor: 0x666688,
  },
  diamond: {
    bg: 0x55ddff, text: 0x0a1a3e,
    selectedBg: 0x99eeff, selectedText: 0x0a1a3e,
    borderWidth: 3, borderColor: 0x0066aa,
  },
  bomb: {
    bg: 0xff2222, text: 0xffffff,
    selectedBg: 0xff5544, selectedText: 0xffffff,
    borderWidth: 3, borderColor: 0x880000,
  },
  lightning: {
    bg: 0xffee00, text: 0x1a1a2e,
    selectedBg: 0xffff55, selectedText: 0x1a1a2e,
    borderWidth: 3, borderColor: 0x887700,
  },
  prism: {
    bg: 0xbb66ff, text: 0xffffff,
    selectedBg: 0xdd88ff, selectedText: 0xffffff,
    borderWidth: 3, borderColor: 0x6622aa,
  },
  rainbow: {
    bg: 0xff6699, text: 0xffffff,
    selectedBg: 0xff88bb, selectedText: 0xffffff,
    borderWidth: 3, borderColor: 0x993355,
  },
  ice: {
    bg: 0x99ddff, text: 0x0a2a4e,
    selectedBg: 0xbbeeff, selectedText: 0x0a2a4e,
    borderWidth: 3, borderColor: 0x4488aa,
  },
  frozen: {
    bg: 0x5588bb, text: 0xeeffff,
    selectedBg: 0x77aadd, selectedText: 0xffffff,
    borderWidth: 4, borderColor: 0x88ccee,
  },
  mirror: {
    bg: 0xddddee, text: 0x222233,
    selectedBg: 0xeeeeff, selectedText: 0x111122,
    borderWidth: 3, borderColor: 0x8888aa,
  },
  vortex: {
    bg: 0x9933ee, text: 0xffffff,
    selectedBg: 0xbb55ff, selectedText: 0xffffff,
    borderWidth: 3, borderColor: 0x5511aa,
  },
  gem: {
    bg: 0x22dd88, text: 0x0a2e1a,
    selectedBg: 0x55ffbb, selectedText: 0x0a2e1a,
    borderWidth: 3, borderColor: 0x007744,
  },
};
