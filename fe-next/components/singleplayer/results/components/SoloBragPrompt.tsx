'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { getBragShareUrl } from '@/utils/share';
import { longestWordOf } from '@/components/results/utils';
import { runBragShare } from '@/utils/bragShare';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  open: boolean;
  onClose: () => void;
  results: Pick<SinglePlayerResultsData, 'playerScore' | 'playerWords' | 'isNewHighScore'>;
  isWinner: boolean;
  t: TFn;
}

export function SoloBragPrompt({ open, onClose, results, isWinner, t }: Props) {
  const [busy, setBusy] = useState(false);
  const record = results.isNewHighScore;
  const score = results.playerScore;
  const best = longestWordOf(results.playerWords);

  const url = useMemo(
    () => (open ? getBragShareUrl('solo', { score, mode: 'singleplayer', words: results.playerWords?.length ?? 0, best: best ?? null }) : ''),
    [open, score, results.playerWords, best],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleShare = useCallback(() => {
    setBusy(true);
    void runBragShare({
      text: t(record ? 'brag2.solo.shareTextRecord' : 'brag2.solo.shareText', { score }),
      url,
      surface: 'solo_results',
      kind: record ? 'solo_record' : 'solo_win',
      copiedLabel: t('brag.copied'),
    }).then((result) => {
      setBusy(false);
      if (result === 'shared' || result === 'copied') onClose();
    });
  }, [record, score, url, t, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-neo-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="solo-brag-title"
        data-testid="solo-brag-prompt"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-neo-lg border-3 border-neo-black bg-neo-navy p-5 text-center text-neo-white shadow-hard"
      >
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute top-2 end-2 inline-flex h-11 w-11 items-center justify-center text-neo-white/70">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <Trophy aria-hidden="true" className="mx-auto h-10 w-10 text-neo-yellow motion-safe:animate-mp-bump" />
        <h2 id="solo-brag-title" className="mt-2 font-neo-display text-2xl font-bold uppercase tracking-wide">
          {t(record ? 'brag2.solo.recordTitle' : 'brag2.solo.winTitle')}
        </h2>
        <p dir="ltr" className="mt-1 font-neo-display text-4xl font-bold tabular-nums text-neo-lime">{score}</p>
        <p className="mt-2 font-neo-body text-sm font-bold text-neo-white/80">{t('brag2.solo.body')}</p>
        <button
          type="button"
          onClick={handleShare}
          disabled={busy}
          data-testid="solo-brag-share"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime py-3 font-neo-display text-lg font-bold uppercase text-neo-black shadow-hard active:translate-y-0.5 active:shadow-none disabled:opacity-60"
        >
          <Trophy aria-hidden="true" className="h-5 w-5" />
          {t('brag2.solo.bragButton')}
        </button>
        <button type="button" onClick={onClose} className="mt-2 min-h-[44px] w-full font-neo-body text-sm font-bold text-neo-white/70 underline">
          {t('brag2.solo.notNow')}
        </button>
      </div>
    </div>
  );
}

export default SoloBragPrompt;
