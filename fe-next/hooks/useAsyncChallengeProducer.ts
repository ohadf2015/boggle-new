'use client';

/**
 * useAsyncChallengeProducer
 *
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
 *
 * On mount, checks sessionStorage for a `pendingAsyncChallenge` config
 * (written by FriendsList when the challenger picks the async flow). If
 * found AND a game result is available, POSTs to /api/growth/async-challenge
 * to create the challenge row and trigger push to the friend.
 *
 * Idempotent: clears storage on success and never fires twice for the same
 * result reference.
 */

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface AsyncChallengeProducerInput {
  /** Final score from the game just played. Must be >= 0 and a finite number. */
  score: number;
  /** Words found by the challenger. */
  words: string[];
  /** Best word (longest or highest-value), optional. */
  bestWord?: string;
  /** The board the challenger played, as a 2D array of letter strings. */
  letterGrid: string[][];
  /** Board edge length (4 for classic 4x4). */
  gridSize: number;
  /** Whether the producer should be enabled — typically true once the game ends. */
  enabled: boolean;
}

interface PendingConfig {
  friendUserId: string;
  friendUsername?: string;
  gameMode: 'classic' | 'blast' | 'word-hunt' | string;
  language: string;
  durationSeconds: number;
  message?: string;
  createdAt: number;
}

const STORAGE_KEY = 'pendingAsyncChallenge';
const MAX_CONFIG_AGE_MS = 60 * 60 * 1000; // 1 hour

function readConfig(): PendingConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingConfig;
    if (!parsed || typeof parsed.friendUserId !== 'string') return null;
    if (Date.now() - (parsed.createdAt ?? 0) > MAX_CONFIG_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearConfig() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
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

    const cfg = readConfig();
    if (!cfg) return;

    // Validate input before firing.
    if (!Array.isArray(input.letterGrid) || input.letterGrid.length === 0) return;
    if (!Number.isFinite(input.score) || input.score < 0) return;
    if (!Number.isInteger(input.gridSize) || input.gridSize < 3) return;

    firedRef.current = true;

    const body = {
      friendUserId: cfg.friendUserId,
      gameMode: cfg.gameMode,
      language: cfg.language,
      durationSeconds: cfg.durationSeconds,
      letterGrid: input.letterGrid,
      gridSize: input.gridSize,
      score: input.score,
      words: input.words,
      bestWord: input.bestWord,
      message: cfg.message,
    };

    fetch('/api/growth/async-challenge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status=${res.status}`);
        clearConfig();
        toast.success(
          t('friends.challenges.async.sent', { name: cfg.friendUsername ?? 'your friend' }),
        );
      })
      .catch((err) => {
        console.error('[useAsyncChallengeProducer] POST failed', err);
        firedRef.current = false; // allow retry on remount
        toast.error(t('friends.errors.sendFailed'));
      });
  }, [input.enabled, input.score, input.words, input.letterGrid, input.gridSize, input.bestWord, t]);
}
