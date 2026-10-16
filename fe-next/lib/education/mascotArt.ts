/** The education mascot, by role. Change art here, never at call sites. */

const ROLES = ['welcome', 'gameStart', 'setup', 'empty', 'success', 'tip', 'noClasses', 'pro', 'shield', 'attack', 'error', 'podium'] as const;
export type EduMascotPose = (typeof ROLES)[number];

const still = (role: EduMascotPose) => `/mascot/edu/edu-${role}-512.webp`;
const loop = (role: EduMascotPose) => ({
  src: `/mascot/edu/video/edu-${role}-loop.mp4`,
  poster: `/mascot/edu/video/edu-${role}-loop.poster.webp`,
});

export const EDU_MASCOT = {
  welcome: still('welcome'),
  gameStart: still('gameStart'),
  setup: still('setup'),
  empty: still('empty'),
  success: still('success'),
  tip: still('tip'),
  noClasses: still('noClasses'),
  pro: still('pro'),
  shield: still('shield'),
  attack: still('attack'),
  error: still('error'),
  podium: still('podium'),
} as const satisfies Record<EduMascotPose, string>;

export const EDU_MASCOT_VIDEO = {
  welcome: loop('welcome'),
  gameStart: loop('gameStart'),
  success: loop('success'),
} as const;
