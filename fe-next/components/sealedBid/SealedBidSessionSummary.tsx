'use client';

import { useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RoundResult } from '@/lib/sealedBid/sp/sbEngine';

interface Props {
  history: RoundResult[];
  totalScore: number;
  chips?: number;
  coinsAwarded?: number;
}

export function buildBluffShareText(
  history: RoundResult[],
  totalScore: number,
  t?: (key: string, params?: Record<string, string | number>) => string,
): string {
  const unique = history.filter((r) => r.outcome === 'unique').length;
  const total = history.length;
  if (t) {
    return [
      t('sealedBid.session.shareHeader', { unique, total, score: totalScore }),
      t('sealedBid.shareCard.url'),
    ].join('\n');
  }
  return `🧠 Outsmarted the bot ${unique}/${total} rounds — ${totalScore} pts\nlexiclash.com/en/sealed-bid`;
}

export function SealedBidSessionSummary({ history, totalScore, chips, coinsAwarded }: Props) {
  const { t, dir } = useLanguage();
  const [copied, setCopied] = useState(false);

  const unique = history.filter((r) => r.outcome === 'unique').length;
  const clash = history.filter((r) => r.outcome === 'clash').length;
  const pass = history.filter((r) => r.outcome === 'none').length;
  const total = history.length;

  const handleShare = async () => {
    const text = buildBluffShareText(history, totalScore, t);
    const canNative = typeof navigator !== 'undefined' && !!navigator.share;
    if (canNative) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canNative = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="rounded-neo border-3 border-black bg-neo-navy-light p-4 shadow-hard space-y-3 animate-[fadeInUp_0.3s_ease-out_0.1s_both] motion-reduce:animate-none" dir={dir}>
      <p className="font-neo-display font-black text-xs uppercase tracking-widest text-neo-white/70 text-center">
        {t('sealedBid.session.title')}
      </p>

      <div className="text-center">
        <span
          data-testid="bluff-unique-count"
          className="font-neo-display font-black text-3xl text-neo-lime"
        >
          {unique}
        </span>
        <span
          data-testid="bluff-total-rounds"
          className="font-neo-display font-black text-xl text-neo-white/50"
        >
          /{total}
        </span>
        <p className="font-neo-body text-xs text-neo-white/60 mt-1">
          {t('sealedBid.session.outsmarted')}
        </p>
      </div>

      <div className="flex justify-center gap-2">
        <div className="flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-navy px-3 py-1.5 shadow-hard-sm">
          <span className="text-sm" aria-hidden="true">{t('sealedBid.outcomeEmoji.unique', '✅')}</span>
          <span className="font-neo-display font-black text-sm text-neo-lime">{unique}</span>
          <span className="font-neo-body text-[10px] text-neo-white/50">{t('sealedBid.session.uniqueLabel')}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-navy px-3 py-1.5 shadow-hard-sm">
          <span className="text-sm" aria-hidden="true">{t('sealedBid.outcomeEmoji.clash', '🤝')}</span>
          <span
            data-testid="bluff-clash-count"
            className="font-neo-display font-black text-sm text-neo-orange"
          >
            {clash}
          </span>
          <span className="font-neo-body text-[10px] text-neo-white/50">{t('sealedBid.session.clashLabel')}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-navy px-3 py-1.5 shadow-hard-sm">
          <span className="text-sm" aria-hidden="true">{t('sealedBid.outcomeEmoji.none', '⬜')}</span>
          <span
            data-testid="bluff-pass-count"
            className="font-neo-display font-black text-sm text-neo-white/40"
          >
            {pass}
          </span>
          <span className="font-neo-body text-[10px] text-neo-white/50">{t('sealedBid.session.passLabel')}</span>
        </div>
      </div>

      {chips !== undefined && coinsAwarded !== undefined && (
        <div className="rounded-neo border-2 border-black bg-neo-navy px-3 py-2 shadow-hard-sm text-center">
          <p className="font-neo-body text-xs text-neo-white/60">{t('sealedBid.session.cashOut')}</p>
          <p className="font-neo-display font-black text-sm text-neo-yellow">
            {chips} {t('sealedBid.session.chips')} → {coinsAwarded} {t('sealedBid.session.coins')}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleShare}
        className="flex w-full items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-purple px-4 py-2.5 font-neo-display font-black text-sm uppercase tracking-wide text-neo-white shadow-hard transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
      >
        {copied ? (
          t('sealedBid.shareCard.copied')
        ) : (
          <>
            {canNative ? (
              <Share2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {t('sealedBid.session.shareCta')}
          </>
        )}
      </button>
    </div>
  );
}
