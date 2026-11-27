'use client';

import { useCallback } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fastValidateWord } from '@/hooks/fastValidateWord';
import { fold, precheck, wordLength, type Precheck } from '@/lib/holidays/arcade/letters';
import { noticeHolidayWord } from '@/lib/holidays/holidayClient';
import type { Language } from '@/shared/types/game';

export type Judgement = { ok: true; word: string; len: number } | { ok: false; reason: Exclude<Precheck, 'ok'> | 'unknown' | 'offline' };

export function useWordJudge(lang: string) {
  const sfx = useSoundEffects();

  return useCallback(
    async (raw: string, pool: readonly string[], used: ReadonlySet<string>): Promise<Judgement> => {
      const pre = precheck(raw, pool, lang, used);
      if (pre !== 'ok') {
        sfx.playWordRejectedSound();
        return { ok: false, reason: pre };
      }
      const valid = await fastValidateWord(raw.toLowerCase(), lang as Language);
      if (valid === null) return { ok: false, reason: 'offline' };
      if (!valid) {
        sfx.playWordRejectedSound();
        return { ok: false, reason: 'unknown' };
      }
      const len = wordLength(raw, lang);
      if (len >= 3) sfx.playWordLengthSound(len);
      else sfx.playWordAcceptedSound();
      noticeHolidayWord(raw);
      return { ok: true, word: fold(raw, lang), len };
    },
    [lang, sfx],
  );
}
