/**
 * Avatar Mood Reaction Engine — pure core.
 *
 * Avatars are rich but go *static* after creation. A `mood` temporarily overrides
 * the eyes/eyebrows/mouth layers (reusing the existing part vocabulary — no new art)
 * so the same avatar reacts to game events: a correct word, a wrong guess, a streak,
 * a win. The override is transient and never mutates the stored config, so paid parts
 * (galaxy/infinity eyes) return the instant the mood clears.
 *
 * Pure + side-effect-free by design → trivially unit-testable, zero mocks. The React
 * shell (AvatarRenderer + useAvatarMood) is the only place timers/DOM live.
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export const AVATAR_MOODS = [
  'idle',
  'thinking',
  'correct',
  'wrong',
  'streak',
  'win',
  'lose',
  'afk',
] as const;

export type AvatarMood = (typeof AVATAR_MOODS)[number];

/** Wrapper animation that accompanies the expression swap. */
export type MoodEffect = 'none' | 'pop' | 'shake' | 'pulse';

export interface MoodExpression {
  /** Typed against the real config so only valid part enum values compile. */
  eyes?: CustomAvatarConfig['eyes'];
  eyebrows?: CustomAvatarConfig['eyebrows'];
  mouth?: CustomAvatarConfig['mouth'];
  effect: MoodEffect;
}

/**
 * Deliberate mapping across the FULL part vocabulary — this table is the feature.
 * flame eyes for a streak, star eyes for a win, dizzy for a wrong answer: that
 * specificity is what makes avatars feel alive rather than merely "animated".
 */
export const MOOD_EXPRESSIONS: Record<AvatarMood, MoodExpression> = {
  idle: { effect: 'none' },
  thinking: { eyes: 'curious', eyebrows: 'raised', mouth: 'oh', effect: 'none' },
  correct: { eyes: 'happy', eyebrows: 'raised', mouth: 'grin', effect: 'pop' },
  wrong: { eyes: 'dizzy', eyebrows: 'worried', mouth: 'frown', effect: 'shake' },
  streak: { eyes: 'flame', eyebrows: 'angryThick', mouth: 'grin', effect: 'pulse' },
  win: { eyes: 'star', eyebrows: 'raised', mouth: 'grin', effect: 'pop' },
  lose: { eyes: 'sad', eyebrows: 'worried', mouth: 'pout', effect: 'shake' },
  afk: { eyes: 'sleepy', eyebrows: 'flat', mouth: 'flat', effect: 'none' },
};

/**
 * Returns a config with the mood's expression layered on top. Identity (same
 * reference) for idle/undefined — the byte-identical-render guarantee. Never
 * mutates the input.
 */
export function applyMood(
  config: CustomAvatarConfig,
  mood?: AvatarMood,
): CustomAvatarConfig {
  if (!mood || mood === 'idle') return config;
  const e = MOOD_EXPRESSIONS[mood];
  if (!e) return config;
  return {
    ...config,
    ...(e.eyes !== undefined ? { eyes: e.eyes } : {}),
    ...(e.eyebrows !== undefined ? { eyebrows: e.eyebrows } : {}),
    ...(e.mouth !== undefined ? { mouth: e.mouth } : {}),
  };
}

export function getMoodEffect(mood?: AvatarMood): MoodEffect {
  if (!mood) return 'none';
  return MOOD_EXPRESSIONS[mood]?.effect ?? 'none';
}

/** CSS class for the wrapper animation; '' when there's no motion to play. */
export function getMoodAnimationClass(mood?: AvatarMood): string {
  const effect = getMoodEffect(mood);
  return effect === 'none' ? '' : `avatar-mood-${effect}`;
}

/**
 * Default lifetime per mood (ms). Transient moods auto-clear back to idle;
 * `thinking`/`afk` are states (0 = persist until explicitly changed).
 */
export const MOOD_DURATION_MS: Record<AvatarMood, number> = {
  idle: 0,
  thinking: 0,
  correct: 900,
  wrong: 700,
  streak: 1600,
  win: 2200,
  lose: 1600,
  afk: 0,
};
