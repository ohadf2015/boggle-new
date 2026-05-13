'use client';

/**
 * useAsyncChallengeProducer
 *
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
 *
 * Handles BOTH async-challenge SP integration points:
 *
 * 1) **Challenger flow** — sessionStorage `pendingAsyncChallenge` written by
 *    FriendsList when the user picks the async flow. After the game ends, the
 *    hook POSTs to /api/growth/async-challenge to create the row + push to friend.
 *
 * 2) **Challenged flow** — sessionStorage `pendingFriendChallenge` written by
 *    the friend-challenge landing page (Accept CTA). After the friend plays the
 *    same board, the hook PUTs `phase=challenged` to submit their score, server
 *    flips status -> completed + fires result push to both sides.
 *
 * Both flows are mutually exclusive (only one storage key present at a time).
 * Idempotent — clears storage on success and never fires twice for the same
 * result reference (firedRef gate).
 */

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface AsyncChallengeProducerInput {
  /** Final score from the game just played. Must be >= 0 and finite. */
  score: number;
  /** Words found. */
  words: string[];
  /** Best word (longest or highest-value), optional. */
  bestWord?: string;
  /** The board played, as a 2D array of letter strings. */
  letterGrid: string[][];
  /** Board edge length (4 for classic 4x4). */
  gridSize: number;
  /** Whether the producer should be enabled — true once the game ends. */
  enabled: boolean;
}

interface ChallengerConfig {
  friendUserId: string;
  friendUsername?: string;
  gameMode: 'classic' | 'blast' | 'word-hunt' | string;
  language: string;
  durationSeconds: number;
  message?: string;
  createdAt: number;
}

interface ChallengedConfig {
  id: string;
  gameMode: string;
  language: string;
  durationSeconds: number;
  targetScore: number | null;
}

const KEY_CHALLENGER = 'pendingAsyncChallenge';
const KEY_CHALLENGED = 'pendingFriendChallenge';
const MAX_CONFIG_AGE_MS = 60 * 60 * 1000; // 1 hour

function readChallengerConfig(): ChallengerConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY_CHALLENGER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChallengerConfig;
    if (!parsed || typeof parsed.friendUserId !== 'string') return null;
    if (Date.now() - (parsed.createdAt ?? 0) > MAX_CONFIG_AGE_MS) {
      sessionStorage.removeItem(KEY_CHALLENGER);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readChallengedConfig(): ChallengedConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY_CHALLENGED);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChallengedConfig;
    if (!parsed || typeof parsed.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function clear(key: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function useAsyncChallengeProducer(input: AsyncChallengeProducerInput): void {
  const { t } = useLanguage();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!input.enabled) return;
    if (firedRef.current) return;

    if (!Array.isArray(input.letterGrid) || input.letterGrid.length === 0) return;
    if (!Number.isFinite(input.score) || input.score < 0) return;
    if (!Number.isInteger(input.gridSize) || input.gridSize < 3) return;

    // Challenger flow takes priority — POST creates challenge.
    const challengerCfg = readChallengerConfig();
    if (challengerCfg) {
      firedRef.current = true;
      const body = {
        friendUserId: challengerCfg.friendUserId,
        gameMode: challengerCfg.gameMode,
        language: challengerCfg.language,
        durationSeconds: challengerCfg.durationSeconds,
        letterGrid: input.letterGrid,
        gridSize: input.gridSize,
        score: input.score,
        words: input.words,
        bestWord: input.bestWord,
        message: challengerCfg.message,
      };
      fetch('/api/growth/async-challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`status=${res.status}`);
          clear(KEY_CHALLENGER);
          toast.success(
            t('friends.challenges.async.sent', { name: challengerCfg.friendUsername ?? 'your friend' }),
          );
        })
        .catch((err) => {
          console.error('[useAsyncChallengeProducer] POST failed', err);
          firedRef.current = false;
          toast.error(t('friends.errors.sendFailed'));
        });
      return;
    }

    // Challenged flow — PUT phase=challenged submits friend's score.
    const challengedCfg = readChallengedConfig();
    if (challengedCfg) {
      firedRef.current = true;
      fetch(`/api/growth/async-challenge?id=${challengedCfg.id}&phase=challenged`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          score: input.score,
          words: input.words,
          bestWord: input.bestWord,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`status=${res.status}`);
          const data = await res.json() as { winnerUserId: string | null };
          clear(KEY_CHALLENGED);
          // Result push fires server-side; toast a local confirmation.
          const target = challengedCfg.targetScore ?? 0;
          const won = input.score > target;
          const tied = input.score === target;
          const key = tied
            ? 'friends.challenges.result.tie'
            : won
            ? 'friends.challenges.result.win'
            : 'friends.challenges.result.loss';
          toast.success(
            t(key, {
              mine: String(input.score),
              theirs: String(target),
            }),
          );
          void data;
        })
        .catch((err) => {
          console.error('[useAsyncChallengeProducer] PUT challenged failed', err);
          firedRef.current = false;
          toast.error(t('friends.errors.sendFailed'));
        });
    }
  }, [input.enabled, input.score, input.words, input.letterGrid, input.gridSize, input.bestWord, t]);
}
