'use client';

import { useEffect, useRef } from 'react';
import type { AvatarMood } from '@/lib/avatar/avatarMood';
import { useAvatarMood } from '@/hooks/useAvatarMood';
import {
  deriveLeaderboardMood,
  type LeaderboardMoodInput,
} from '@/lib/avatar/leaderboardMood';
import { applyTrait, type AvatarTrait } from '@/lib/avatar/avatarPersonality';

export interface ReactiveAvatarMoodInput extends LeaderboardMoodInput {
  /** Absolute current score — the effect KEY (see note below). */
  score: number;
  /** Absolute current rank/index — the effect KEY. */
  rank: number;
  /** Player's personality trait — remaps the reaction. Defaults to 'standard'. */
  trait?: AvatarTrait;
}

/**
 * Drives a leaderboard avatar's transient mood from the per-tick signals the
 * leaderboard already computes. Wraps the generic `useAvatarMood` engine and
 * applies the leaderboard policy (`deriveLeaderboardMood`).
 *
 * KEYING — load-bearing: the effect is keyed on the ABSOLUTE `score`/`rank`,
 * NOT on the deltas. `scoreChange`/`rankChange` are diffed values, not events:
 * two consecutive equal deltas (score 10→20→30, both delta 10) are
 * `Object.is`-equal, so a delta-keyed effect would be skipped by React and the
 * second word would silently drop its reaction. Absolute score/rank advance on
 * every real event, so the effect fires every time; the deltas are read in that
 * same render purely for the derivation.
 *
 * Refs hold the latest deltas/combo so the effect reads current values without
 * widening its dependency array (which would re-introduce the delta-keying bug).
 */
export function useReactiveAvatarMood(input: ReactiveAvatarMoodInput): AvatarMood {
  const { score, rank, scoreChange, rankChange, comboLevel, trait = 'standard' } = input;
  const { mood, trigger } = useAvatarMood();

  const latest = useRef({ scoreChange, rankChange, comboLevel, trait });
  latest.current = { scoreChange, rankChange, comboLevel, trait };

  // Skip the mount render: there is no prior event to react to.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const base = deriveLeaderboardMood(latest.current);
    const next = applyTrait(base, latest.current.trait);
    if (next) trigger(next);
    // Keyed on absolute score/rank ONLY — see KEYING note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, rank]);

  return mood;
}
