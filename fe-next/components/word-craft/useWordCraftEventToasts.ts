'use client';

import { useEffect, useRef, useState } from 'react';
import type { WordCraftState } from '@/lib/word-craft/useWordCraftGame';
import type { WordCraftToast } from './WordCraftEventToast';

type TFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * The turn-event banner shared by the solo screen and the classroom run:
 * - a bot turn that placed nothing (skip / swap / pass) is announced — it used
 *   to be silent and read as "the bot didn't play";
 * - a surprise box opening names its reward (gold for you, pink for the rival).
 * Callers can push their own toasts (clue text, lesson hits) through `show`.
 */
export function useWordCraftEventToasts(state: WordCraftState, t: TFn) {
  const [toast, setToast] = useState<WordCraftToast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.ms ?? 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const seenLen = useRef(state.history.length);
  useEffect(() => {
    const len = state.history.length;
    if (len === seenLen.current) return;
    seenLen.current = len;
    const newest = state.history[len - 1];
    if (newest?.who !== 'bot' || !newest.kind || state.hotseat) return;
    const key =
      newest.kind === 'skip' ? 'wordcraft.botSkipped' : newest.kind === 'swap' ? 'wordcraft.botSwapped' : 'wordcraft.botPassed';
    setToast({ key: len, tone: 'bot', text: t(key, { name: t('wordcraft.bot') }) });
  }, [state.history, state.hotseat, t]);

  const lastSurprise = state.lastSurprise;
  useEffect(() => {
    if (!lastSurprise) return;
    const mine = lastSurprise.by === 'player';
    const hotseat = state.hotseat;
    const name = hotseat ? t(mine ? 'wordcraft.player1' : 'wordcraft.player2') : t('wordcraft.bot');
    setToast({
      key: lastSurprise.turnIndex + 1000,
      tone: mine || hotseat ? 'gold' : 'bot',
      text: mine && !hotseat ? t('wordcraft.surprise.title') : t('wordcraft.surprise.otherTitle', { name }),
      detail: t(`wordcraft.surprise.${lastSurprise.kind}`, { count: lastSurprise.count }),
      ms: 2600,
    });
    // Only a NEW reveal should toast — not a hotseat/t identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSurprise]);

  return { toast, show: setToast };
}
