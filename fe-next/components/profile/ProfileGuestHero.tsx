'use client';

import React from 'react';
import { Gem, Lock, Star, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Mascot } from '@/components/ui/Mascot';
import { MascotRig } from '@/components/motion/MascotRig';
import { PopIn } from '@/components/motion/PopIn';
import { cn } from '@/lib/utils';

interface ProfileGuestHeroProps {
  canSignIn: boolean;
  /** exp-profile-locked-tile-tap-v1 `tappable` arm. */
  tilesTappable: boolean;
  onSignIn: () => void;
  onLockedTileTap: () => void;
  onPlay: () => void;
}

const TILES = [
  { key: 'profile.totalScore', Icon: Star, color: 'text-neo-cyan' },
  { key: 'profile.wins', Icon: Trophy, color: 'text-neo-pink' },
  { key: 'profile.achievements', Icon: Gem, color: 'text-neo-lime' },
] as const;

/** Guest profile: the mascot, a peek at the stats they'd keep, and one way forward. */
export function ProfileGuestHero({ canSignIn, tilesTappable, onSignIn, onLockedTileTap, onPlay }: ProfileGuestHeroProps): React.ReactElement {
  const { t } = useLanguage();

  return (
    <section className="flex flex-col items-center text-center">
      <MascotRig state="hop" className="mb-3">
        <Mascot variant="waiting" size="sm" animated={false} priority />
      </MascotRig>

      <h2 className="text-3xl font-black font-neo-display uppercase tracking-tight text-neo-white">
        {t('profile.title')}
      </h2>
      <p className="mt-2 max-w-xs text-base text-neo-white/75 font-neo-body">{t('auth.upgradePrompt')}</p>

      <ul className="mt-7 grid w-full grid-cols-3 gap-3">
        {TILES.map(({ key, Icon, color }, index) => (
          <PopIn as="li" key={key} index={index} delay={0.15}>
            <div
              className={cn('flex flex-col items-center gap-1 py-1', tilesTappable && 'cursor-pointer')}
              {...(tilesTappable
                ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: onLockedTileTap,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') onLockedTileTap();
                    },
                  }
                : {})}
            >
              <Icon className={cn('size-6', color)} strokeWidth={2.5} aria-hidden />
              <span className="inline-flex items-center gap-1 font-neo-display text-2xl font-black text-neo-white/40">
                <Lock className="size-3.5" aria-hidden />—
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-neo-white/80 leading-tight">{t(key)}</span>
            </div>
          </PopIn>
        ))}
      </ul>

      <Button
        press="chunky"
        variant="cyan"
        size="lg"
        haptic
        onClick={canSignIn ? onSignIn : onPlay}
        className="mt-8 w-full max-w-sm"
      >
        {canSignIn ? t('auth.signIn') : t('profile.backToGame')}
      </Button>
    </section>
  );
}

export default ProfileGuestHero;
