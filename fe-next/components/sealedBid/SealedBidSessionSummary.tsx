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
  return `🧠 Outsmarted the bot ${unique}/${total} rounds — ${totalScore} pts\nlexiclash.live/en/sealed-bid`;
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

      {/* Per-round breakdown. `history` already carries the word, the rival word
          and the chip delta for every round — the screen was throwing all of it
          away and showing three aggregate counts, so a player could not see
          which of their words actually paid. */}
      {total > 0 && (
        <ul className="space-y-1" data-testid="sb-round-list">
          {history.map((r, i) => (
            <li
              key={i}
              data-testid="sb-round-row"
              data-outcome={r.outcome}
              className={`flex items-center gap-2 rounded-neo border-2 border-black px-2 py-1.5 shadow-hard-sm ${
                r.outcome === 'unique'
                  ? 'bg-neo-navy'
                  : r.outcome === 'clash'
                    ? 'bg-neo-red/20'
                    : 'bg-neo-navy/60'
              }`}
            >
              <span className="font-neo-display text-[10px] font-black tabular-nums text-neo-white/40">
                {t('sealedBid.shareCard.roundLabel', { n: i + 1 })}
              </span>
              <span className="text-xs" aria-hidden="true">
                {t(`sealedBid.outcomeEmoji.${r.outcome}`)}
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-neo-display text-xs font-black uppercase tracking-wide ${
                  r.playerWord ? 'text-neo-white' : 'text-neo-white/30'
                }`}
              >
                {r.playerWord || t('sealedBid.noWord', '—')}
              </span>
              {/* No rival word here on purpose: `botWord` is only botPicks[0],
                  so on a unique round it names a rival you never clashed with,
                  and on a clash it is your own word repeated. The tint, the
                  emoji and the delta already carry the outcome. */}
              <span
                dir="ltr"
                className={`shrink-0 font-neo-display text-xs font-black tabular-nums ${
                  r.points > 0
                    ? 'text-neo-lime'
                    : r.points < 0
                      ? 'text-neo-red'
                      : 'text-neo-white/40'
                }`}
              >
                {r.points > 0 ? `+${r.points}` : `${r.points}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Only when coins were actually paid. `coinsAwarded` starts at 0 and the
          daily claim short-circuits on a second run the same day, so the old
          `!== undefined` guard ended winning sessions with "40 chips → 0 coins". */}
      {chips !== undefined && !!coinsAwarded && coinsAwarded > 0 && (
        <div
          data-testid="sb-cashout"
          className="rounded-neo border-2 border-black bg-neo-navy px-3 py-2 shadow-hard-sm text-center"
        >
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
