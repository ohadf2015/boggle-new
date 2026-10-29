/** The education mascot, by role. Change art here, never at call sites. */

const ROLES = ['welcome', 'gameStart', 'setup', 'empty', 'success', 'tip', 'noClasses', 'pro', 'shield', 'attack', 'error', 'podium', 'scanJoin',
  'warmup', 'exitTicket', 'brainBreak', 'icebreaker', 'spellingBee', 'reviewTest', 'esl', 'earlyFinisher',
  'backToSchool', 'autumn', 'winter', 'spring', 'endOfYear', 'pickGrade', 'pickLanguage', 'firstClass'] as const;
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
  scanJoin: still('scanJoin'),
  warmup: still('warmup'),
  exitTicket: still('exitTicket'),
  brainBreak: still('brainBreak'),
  icebreaker: still('icebreaker'),
  spellingBee: still('spellingBee'),
  reviewTest: still('reviewTest'),
  esl: still('esl'),
  earlyFinisher: still('earlyFinisher'),
  backToSchool: still('backToSchool'),
  autumn: still('autumn'),
  winter: still('winter'),
  spring: still('spring'),
  endOfYear: still('endOfYear'),
  pickGrade: still('pickGrade'),
  pickLanguage: still('pickLanguage'),
  firstClass: still('firstClass'),
} as const satisfies Record<EduMascotPose, string>;

export const EDU_MASCOT_VIDEO = {
  welcome: loop('welcome'),
  gameStart: loop('gameStart'),
  success: loop('success'),
} as const;
