// The one place education mascot art is named: swap the character by editing these paths only.

const BASE = '/mascot/edu';

export interface EduMascotPose {
  /** Transparent still, 512px square. */
  still: string;
  /** Optional idle loop; render the still alone under reduced motion. */
  video?: string;
  /** Poster frame for `video`. */
  poster?: string;
}

const still = (role: string): EduMascotPose => ({ still: `${BASE}/edu-${role}-512.webp` });
const looped = (role: string): EduMascotPose => ({
  ...still(role),
  video: `${BASE}/video/edu-${role}-loop.mp4`,
  poster: `${BASE}/video/edu-${role}-loop.poster.webp`,
});

export const EDU_MASCOT = {
  welcome: looped('welcome'),
  gameStart: looped('gameStart'),
  setup: still('setup'),
  empty: still('empty'),
  success: looped('success'),
  tip: still('tip'),
  noClasses: still('noClasses'),
  pro: still('pro'),
  shield: still('shield'),
  attack: still('attack'),
  error: still('error'),
  podium: still('podium'),
} as const satisfies Record<string, EduMascotPose>;

export type EduMascotMoment = keyof typeof EDU_MASCOT;
