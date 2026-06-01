'use client';

import { useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RoundResult } from '@/lib/sealedBid/sp/sbEngine';

const OUTCOME_EMOJI: Record<RoundResult['outcome'], string> = {
  unique: '✅',
  clash: '🤝',
  none: '⬜',
};

const OUTCOME_STYLE: Record<RoundResult['outcome'], string> = {
  unique: 'text-neo-lime',
  clash: 'text-neo-orange',
  none: 'text-neo-white/40',
};

export function buildShareText(history: RoundResult[], totalScore: number): string {
  const rows = history.map((r, i) => {
    const emoji = OUTCOME_EMOJI[r.outcome];
    const you = r.playerWord ?? '—';
    const pts = r.points > 0 ? ` +${r.points}` : '';
    return `R${i + 1} ${emoji} ${you} vs ${r.botWord}${pts}`;
  });
  return ['🎯 Sealed Bid — ' + totalScore + 'pts', ...rows, 'lexiclash.com/en/sealed-bid'].join('\n');
}

interface Props {
  history: RoundResult[];
  totalScore: number;
}

export function SealedBidShareCard({ history, totalScore }: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = buildShareText(history, totalScore);
    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
    if (canNativeShare) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="rounded-neo border-3 border-black bg-neo-navy-light p-4 shadow-hard space-y-3 animate-[fadeInUp_0.3s_ease-out_both] motion-reduce:animate-none">
      <p className="font-neo-display font-black text-xs uppercase tracking-widest text-neo-white/70 text-center">
        {t('sealedBid.shareCard.title')}
      </p>

      <div className="space-y-1.5">
        {history.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-neo border-2 border-black bg-neo-navy px-3 py-1.5 shadow-hard-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="font-neo-body text-[11px] text-neo-white/50 w-5 shrink-0 text-center">
              R{i + 1}
            </span>
            <span className={`text-sm shrink-0 ${OUTCOME_STYLE[r.outcome]}`}>
              {OUTCOME_EMOJI[r.outcome]}
            </span>
            <span className="font-neo-display font-black text-sm text-neo-lime min-w-[3.5rem]">
              {r.playerWord ?? '—'}
            </span>
            <span className="font-neo-body text-[10px] text-neo-white/30 shrink-0">vs</span>
            <span className="font-neo-display font-black text-sm text-neo-pink flex-1">
              {r.botWord}
            </span>
            {r.points > 0 && (
              <span className="font-neo-display font-black text-xs text-neo-cyan shrink-0">
                +{r.points}
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="flex w-full items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-purple px-4 py-2.5 font-neo-display font-black text-sm uppercase tracking-wide text-neo-white shadow-hard transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
      >
        {copied ? (
          t('sealedBid.shareCard.copied')
        ) : (
          <>
            {canNativeShare ? (
              <Share2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {t('sealedBid.shareCard.cta')}
          </>
        )}
      </button>
    </div>
  );
}
