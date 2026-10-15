/** The one place that names the education mascot's art; swap the character here, never at call sites. */

const pose = (role: string) => `/mascot/edu/edu-${role}-512.webp`;

export const EDU_MASCOT = {
  welcome: pose('welcome'),
  gameStart: pose('gameStart'),
  setup: pose('setup'),
  empty: pose('empty'),
  success: pose('success'),
  tip: pose('tip'),
  noClasses: pose('noClasses'),
  pro: pose('pro'),
  shield: pose('shield'),
  attack: pose('attack'),
  error: pose('error'),
  podium: pose('podium'),
} as const;

export type EduMascotPose = keyof typeof EDU_MASCOT;
