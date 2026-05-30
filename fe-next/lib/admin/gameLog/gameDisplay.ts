/**
 * Pure display helpers for the admin game log — shared across every source so a
 * row from analytics_events and a row from game_results render identically.
 */
import type { UnifiedGame } from '@/components/admin/today-games/types';

type T = (key: string, fallback?: string) => string;

const CANONICAL_MODE_LABELS: Record<string, string> = {
  'word-hunt': 'Word Hunt',
  daily_word: 'Word Hunt',
  'wheel-rush': 'Word Wheel',
  word_wheel: 'Word Wheel',
  'word-wheel': 'Word Wheel',
  classic: 'Classic',
  ranked: 'Ranked',
  casual: 'Casual',
  blast: 'Blast',
  blast_multiplayer: 'Blast',
  'word-tower': 'Word Tower',
  daily_challenge: 'Daily Challenge',
  drill: 'Brain Drill',
  practice: 'Classroom Practice',
  // Modes seen live (2026-05-30) that previously fell through to titleCase.
  adventure: 'Adventure',
  'adventure-boss': 'Adventure Boss',
  arena: 'Arena',
  brainGym: 'Brain Gym',
  quickPlay: 'Quick Play',
  tutorial: 'Tutorial',
  survival: 'Survival',
  random: 'Random',
  connections: 'Connections',
  singleplayer: 'Single Player',
  'solo-bots': 'Single Player vs Bots',
  multiplayer: 'Multiplayer',
  wordCraft: 'Word Craft',
  wordCraftCards: 'Word Craft · Cards',
  wordCraftGems: 'Word Craft · Gems',
};

function titleCase(raw: string): string {
  return raw
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function gameModeLabel(mode: string | null | undefined, _t: T): string {
  if (!mode) return '—';
  return CANONICAL_MODE_LABELS[mode] ?? titleCase(mode);
}

export interface PlayersSummary {
  humans: number;
  bots: number;
  botsKnown: boolean;
  text: string;
}

export function playersSummary(game: UnifiedGame): PlayersSummary {
  if (!game.is_multiplayer) {
    return { humans: 1, bots: 0, botsKnown: false, text: 'Single player' };
  }
  const humans = game.player_count ?? 1;
  const botsKnown = typeof game.bot_count === 'number';
  const bots = botsKnown ? (game.bot_count as number) : 0;
  const text = botsKnown
    ? `${humans} players · ${bots} bots`
    : `${humans} players`;
  return { humans, bots, botsKnown, text };
}

export function deviceLabel(game: UnifiedGame): string {
  const parts = [
    game.device_type ? titleCase(game.device_type) : null,
    game.os ?? null,
    game.browser ?? null,
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(' · ') : 'Unknown device';
}
