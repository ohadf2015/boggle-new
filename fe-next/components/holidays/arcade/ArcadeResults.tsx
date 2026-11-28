'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw, Share2, LayoutGrid } from 'lucide-react';
import { Coins } from '@/components/ui/CoinsIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import { shareNative } from '@/components/daily/holiday/holidayShare';
import type { ArcadeGameId } from '@/lib/holidays/arcade/games';
import type { BestResult } from '@/lib/holidays/arcade/best';
import { cn } from '@/lib/utils';
import type { RoundEnd, Settle } from './useArcadeRound';
import styles from './arcade.module.css';
import { useFreshTap } from './useFreshTap';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

interface Props {
  game: ArcadeGameId;
  end: RoundEnd;
  settle: Settle;
  best: BestResult;
  headline: string;
  onAgain: () => void;
  onHub: () => void;
}

const btn = 'flex h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-black font-neo-display text-base font-black shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed';

export default function ArcadeResults({ game, end, settle, best, headline, onAgain, onHub }: Props) {
  const { t, language } = useLanguage();
  const [authOpen, setAuthOpen] = useState(false);
  const { surface, guard } = useFreshTap();
  const shown = end.champion ? (end.championScore ?? end.score) : end.score;

  const share = () => {
    const url = `${window.location.origin}/${language}/holiday-arcade?g=${game}`;
    void shareNative(t('holiday.arcade.shareText', { score: shown, game: t(`holiday.arcade.${game}.title`) }), url);
  };

  return (
    <div {...surface} role="dialog" aria-modal="true" aria-labelledby="arcade-results-title" className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
      {end.champion ? (
        <p data-testid="arcade-champion" className="font-neo-display text-4xl font-black leading-tight text-neo-lime [text-shadow:3px_3px_0_rgb(var(--neo-black))]">{t('holiday.arcade.family.champion', { name: end.champion })}</p>
      ) : (
        <p className="font-neo-display text-sm font-bold uppercase tracking-wide text-neo-white/70">{headline}</p>
      )}
      <h2 id="arcade-results-title" className={cn('font-neo-display font-black tabular-nums text-neo-white', end.champion ? 'text-3xl' : 'text-5xl', ' [text-shadow:3px_3px_0_rgb(var(--neo-black))]', styles.pop)}>
        {shown}
      </h2>
      {best.verdict && (
        <p
          data-testid="arcade-best"
          className={cn(
            'rounded-full border-[3px] border-black px-4 py-1 font-neo-display text-lg font-black shadow-hard',
            best.verdict === 'close' ? 'bg-neo-pink text-neo-white' : 'bg-neo-lime text-neo-navy',
            styles.pop,
          )}
        >
          {best.verdict === 'close' ? t('holiday.arcade.soClose', { gap: best.best - shown }) : t(`holiday.arcade.${best.verdict === 'new' ? 'newBest' : 'tieBest'}`)}
        </p>
      )}
      {best.verdict !== 'new' && !end.champion && <p className="font-neo-display text-sm font-black text-neo-white/80">{t('holiday.arcade.bestScore', { score: best.best })}</p>}
      {(end.players ?? 1) > 1 && <p className="text-sm text-neo-white/80">{t('holiday.arcade.family.yourScore')}</p>}

      {settle.state !== 'guest' && (
        <div role="status" className="flex min-h-10 items-center gap-2 rounded-xl border-2 border-black bg-neo-navy-light px-3 py-2 text-sm font-bold">
          <Coins className="size-5 text-neo-holiday-gold" aria-hidden="true" />
          {settle.state === 'saving' && <span>{t('holiday.arcade.saving')}</span>}
          {settle.state === 'error' && <span>{t('holiday.arcade.saveError')}</span>}
          {settle.state === 'done' && settle.coinError && <span>{t('holiday.arcade.saveError')}</span>}
          {settle.state === 'done' && !settle.coinError && (
            <span>{settle.coins > 0 ? t(pluralKeyOf('holiday.arcade.coins', settle.coins, language), { count: settle.coins }) : t('holiday.arcade.capReached')}</span>
          )}
        </div>
      )}

      <div className="grid w-full max-w-xs gap-2">
        <button type="button" autoFocus onClick={guard(onAgain)} className={cn(btn, 'bg-neo-lime text-neo-navy')}>
          <RotateCcw className="size-5" aria-hidden="true" />
          {t('holiday.arcade.again')}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={guard(share)} className={cn(btn, 'bg-neo-cream text-neo-navy')}>
            <Share2 className="size-5" aria-hidden="true" />
            {t('holiday.arcade.share')}
          </button>
          <button type="button" onClick={guard(onHub)} className={cn(btn, 'bg-neo-navy-light text-neo-white')}>
            <LayoutGrid className="size-5" aria-hidden="true" />
            {t('holiday.arcade.hub')}
          </button>
        </div>
        {settle.state === 'guest' && (
          <>
            <button type="button" onClick={() => setAuthOpen(true)} className={cn(btn, 'bg-[var(--arcade-accent)] text-neo-white')}>
              {t('holiday.arcade.signIn')}
            </button>
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />
          </>
        )}
      </div>
    </div>
  );
}
