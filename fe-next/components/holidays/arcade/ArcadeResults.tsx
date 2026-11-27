'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw, Share2, LayoutGrid } from 'lucide-react';
import { Coins } from '@/components/ui/CoinsIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { shareNative } from '@/components/daily/holiday/holidayShare';
import type { ArcadeGameId } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';
import type { RoundEnd, Settle } from './useArcadeRound';
import styles from './arcade.module.css';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

interface Props {
  game: ArcadeGameId;
  end: RoundEnd;
  settle: Settle;
  headline: string;
  onAgain: () => void;
  onHub: () => void;
}

const btn = 'flex h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-black font-neo-display text-base font-black shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed';

export default function ArcadeResults({ game, end, settle, headline, onAgain, onHub }: Props) {
  const { t, language } = useLanguage();
  const [authOpen, setAuthOpen] = useState(false);
  const shown = end.score;

  const share = () => {
    const url = `${window.location.origin}/${language}/holiday-arcade?g=${game}`;
    void shareNative(t('holiday.arcade.shareText', { score: shown, game: t(`holiday.arcade.${game}.title`) }), url);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="arcade-results-title" className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
      <p className="font-neo-display text-sm font-bold uppercase tracking-wide text-neo-white/70">{headline}</p>
      <h2 id="arcade-results-title" className={cn('font-neo-display text-5xl font-black tabular-nums text-neo-holiday-gold [text-shadow:3px_3px_0_rgb(var(--neo-black))]', styles.pop)}>
        {shown}
      </h2>
      <p className="text-sm text-neo-white/80">{t('holiday.arcade.wordsFound', { count: end.plays.length })}</p>

      <div role="status" className="flex min-h-10 items-center gap-2 rounded-xl border-2 border-black bg-neo-navy-light px-3 py-2 text-sm font-bold">
        <Coins className="size-5 text-neo-holiday-gold" aria-hidden="true" />
        {settle.state === 'saving' && <span>{t('holiday.arcade.saving')}</span>}
        {settle.state === 'error' && <span>{t('holiday.arcade.saveError')}</span>}
        {settle.state === 'guest' && <span>{t('holiday.arcade.guestCoins')}</span>}
        {settle.state === 'done' && settle.coinError && <span>{t('holiday.arcade.saveError')}</span>}
        {settle.state === 'done' && !settle.coinError && (
          <span>{settle.coins > 0 ? t('holiday.arcade.coins', { count: settle.coins }) : t('holiday.arcade.capReached')}</span>
        )}
      </div>

      <div className="grid w-full max-w-xs gap-2">
        <button type="button" autoFocus onClick={onAgain} className={cn(btn, 'bg-neo-lime text-neo-navy')}>
          <RotateCcw className="size-5" aria-hidden="true" />
          {t('holiday.arcade.again')}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={share} className={cn(btn, 'bg-neo-cream text-neo-navy')}>
            <Share2 className="size-5" aria-hidden="true" />
            {t('holiday.arcade.share')}
          </button>
          <button type="button" onClick={onHub} className={cn(btn, 'bg-neo-navy-light text-neo-white')}>
            <LayoutGrid className="size-5" aria-hidden="true" />
            {t('holiday.arcade.hub')}
          </button>
        </div>
        {settle.state === 'guest' && (
          <>
            <button type="button" onClick={() => setAuthOpen(true)} className={cn(btn, 'bg-neo-holiday-gold text-neo-navy')}>
              {t('holiday.arcade.signIn')}
            </button>
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />
          </>
        )}
      </div>
    </div>
  );
}
