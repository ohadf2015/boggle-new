/**
 * Pure reaction + reward rules for the academy mode scenes (Word Workshop,
 * Missed Words Review). No React, no randomness: every value is a function of
 * its input, so a re-render never re-rolls a taunt or re-scatters a burst.
 */

export type RivalMood = 'idle' | 'attack' | 'hurt' | 'enraged' | 'defeated';
export type AcademyChestTier = 'bronze' | 'silver' | 'gold';
export type ReviewMascotMood = 'think' | 'cheer' | 'fire' | 'oops';

const BARON = '/images/bosses/boss-baron-buildaword';

/** Baron Buildaword — the Word Workshop's clockwork rival. One pose per mood. */
export const RIVAL_ART: Record<RivalMood, string> = {
  idle: `${BARON}.png`,
  attack: `${BARON}-attack.png`,
  hurt: `${BARON}-hurt.png`,
  enraged: `${BARON}-enraged.png`,
  defeated: `${BARON}-defeated.png`,
};

export interface Taunt {
  key: string;
  en: string;
}

/** i18n keys + English fallbacks (the component passes both to `t`). */
export const RIVAL_TAUNTS: { bot: Taunt[]; hurt: Taunt[]; enraged: Taunt[] } = {
  bot: [
    { key: 'academy.modes.workshop.rival.taunt1', en: 'Tick-tock! My turn.' },
    { key: 'academy.modes.workshop.rival.taunt2', en: 'Beat THAT, apprentice!' },
    { key: 'academy.modes.workshop.rival.taunt3', en: 'My gears never miss.' },
    { key: 'academy.modes.workshop.rival.taunt4', en: 'This workshop is mine!' },
  ],
  hurt: [
    { key: 'academy.modes.workshop.rival.hurt1', en: 'A lesson word?! My bolts!' },
    { key: 'academy.modes.workshop.rival.hurt2', en: 'Ow! That one sparkled!' },
  ],
  enraged: [
    { key: 'academy.modes.workshop.rival.enraged1', en: 'Hmph. Lucky tile.' },
    { key: 'academy.modes.workshop.rival.enraged2', en: 'Grr… not bad.' },
  ],
};

const pick = <T,>(list: T[], i: number): T => list[((i % list.length) + list.length) % list.length];

export interface RivalMove {
  who: 'player' | 'bot';
  words: readonly string[];
  /** Lesson words hit by this move (player moves only). */
  lessonHits: number;
  /** Index of the move in the match — seeds the taunt choice. */
  moveIndex: number;
}

export function rivalReaction(move: RivalMove): { mood: RivalMood; taunt: Taunt | null } {
  if (move.words.length === 0) return { mood: 'idle', taunt: null };
  if (move.who === 'bot') return { mood: 'attack', taunt: pick(RIVAL_TAUNTS.bot, move.moveIndex) };
  if (move.lessonHits > 0) return { mood: 'hurt', taunt: pick(RIVAL_TAUNTS.hurt, move.moveIndex) };
  return { mood: 'enraged', taunt: pick(RIVAL_TAUNTS.enraged, move.moveIndex) };
}

export function rivalFinalMood({ won, tie }: { won: boolean; tie: boolean }): RivalMood {
  if (won) return 'defeated';
  return tie ? 'enraged' : 'attack';
}

/** The review mascot (crowned ice-cube knight), transparent stickers only. */
export const REVIEW_MASCOT_ART: Record<ReviewMascotMood | 'hello', string> = {
  hello: '/mascot/hello-nobg.webp',
  think: '/mascot/bridge-think-nobg.webp',
  cheer: '/mascot/bridge-cheer-nobg.webp',
  // Static sticker: the animated onfire WebP paints black frames while transformed on Chromium mobile.
  fire: '/mascot/streak-inferno-nobg.webp',
  oops: '/mascot/bridge-oops-nobg.webp',
};

export function reviewMascotMood({ answered, correct, streak }: { answered: boolean; correct: boolean | null; streak: number }): ReviewMascotMood {
  if (answered && correct === false) return 'oops';
  if (streak >= 3) return 'fire';
  return answered && correct ? 'cheer' : 'think';
}

export function workshopChestTier({ won, lessonWords }: { won: boolean; lessonWords: number }): AcademyChestTier {
  if (won && lessonWords >= 2) return 'gold';
  if (won || lessonWords >= 1) return 'silver';
  return 'bronze';
}

export interface RewardFx {
  /** Raw hex — drives gradients/glows, not Tailwind fills. */
  hex: string;
  rays: number;
  sparks: number;
  /** 0..1 — how far sparks travel. */
  spread: number;
}

const REWARD_FX: Record<AcademyChestTier, RewardFx> = {
  bronze: { hex: '#ff6b35', rays: 8, sparks: 10, spread: 0.6 },
  silver: { hex: '#00ffff', rays: 12, sparks: 18, spread: 0.8 },
  gold: { hex: '#ffe135', rays: 18, sparks: 28, spread: 1 },
};

export function rewardFx(tier: AcademyChestTier): RewardFx {
  return REWARD_FX[tier];
}

/** Ease-out-cubic integer count-up that lands exactly on `target`. */
export function countUpValue(target: number, elapsedMs: number, durationMs: number): number {
  if (target <= 0) return Math.max(0, target);
  if (durationMs <= 0 || elapsedMs >= durationMs) return target;
  const p = Math.max(0, elapsedMs) / durationMs;
  return Math.min(target, Math.floor(target * (1 - (1 - p) ** 3)));
}
