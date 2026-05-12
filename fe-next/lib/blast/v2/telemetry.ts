import type { Locale, ThemeKey } from './types';

export function trackBlastLevelStarted(data: {
  level: number;
  locale: Locale;
  theme: ThemeKey;
  mechanics: string[];
}) {
  window.posthog?.capture('blast_level_started', data);
}

export function trackBlastWordFound(data: {
  level: number;
  word: string;
  axis: 'H' | 'V';
  length: number;
  isCascade: boolean;
  isBonus: boolean;
}) {
  window.posthog?.capture('blast_word_found', data);
}

export function trackBlastWordRejected(data: {
  level: number;
  attempted_word: string;
  length: number;
  reason: 'length' | 'axis' | 'gap' | 'frozen' | 'duplicate' | 'unknown';
}) {
  window.posthog?.capture('blast_word_rejected', data);
}

export function trackBlastHintUsed(data: {
  level: number;
  hint_type: 'shuffle' | 'reveal_letter' | 'reveal_word';
  coin_cost: number;
}) {
  window.posthog?.capture('blast_hint_used', data);
}

export function trackBlastLevelCompleted(data: {
  level: number;
  locale: Locale;
  theme: ThemeKey;
  time_seconds: number;
  hints_used: number;
  cascades: number;
  stars: 1 | 2 | 3;
  coins_earned: number;
  gems_collected: number;
}) {
  window.posthog?.capture('blast_level_completed', data);
}

export function trackBlastLevelAbandoned(data: {
  level: number;
  locale: Locale;
  time_in_level_seconds: number;
  words_found_count: number;
}) {
  window.posthog?.capture('blast_level_abandoned', data);
}

export function trackBlastChestOpened(data: {
  chest_number: number;
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  coins: number;
  boosts_count: number;
  avatar_part?: string;
  is_duplicate: boolean;
}) {
  window.posthog?.capture('blast_chest_opened', data);
}

export function trackBlastChestPreviewed(data: {
  chest_number: number;
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  level: number;
}) {
  window.posthog?.capture('blast_chest_previewed', data);
}

export function trackBlastFtueStep(data: {
  step_number: 1 | 2 | 3 | 4 | 5 | 6;
  advance_reason: 'action' | 'timer' | 'skip' | 'resume';
}) {
  window.posthog?.capture('blast_ftue_step', data);
}

export function trackBlastTutorialSeen(data: {
  mechanic: string;
  level: number;
  dismiss_via: 'button' | 'skip_all';
}) {
  window.posthog?.capture('blast_tutorial_seen', data);
}
