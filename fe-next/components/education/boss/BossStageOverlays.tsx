'use client';

import { memo } from 'react';
import { ShieldCheck, Zap, Trophy, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import BossDefeatFireworks from '@/components/celebration/BossDefeatFireworks';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import type { BossCue } from './useBossCues';
import { ATTACK_ICON } from './BossAttackClock';
import styles from './boss.module.css';

function Banner({ tone, children, testId }: { tone: 'pink' | 'cyan' | 'lime' | 'yellow'; children: React.ReactNode; testId: string }) {
  const toneClass = {
    pink: 'bg-neo-pink text-neo-black',
    cyan: 'bg-neo-cyan text-neo-black',
    lime: 'bg-neo-lime text-neo-black',
    yellow: 'bg-neo-yellow text-neo-black',
  }[tone];
  return (
    <div
      data-testid={testId}
      role="status"
      className={cn(
        'flex items-center gap-[0.8vw] rounded-[0.8vw] border-[0.3vw] border-neo-black px-[2vw] py-[0.9vw] font-neo-display text-[3.2vw] font-black uppercase leading-none shadow-hard-2xl',
        toneClass,
        styles.slideIn,
      )}
    >
      {children}
    </div>
  );
}

export const BossStageOverlays = memo(function BossStageOverlays({ view, cue, bossName, reducedMotion }: {
  view: ClassroomBossView;
  cue: BossCue | null;
  bossName: string;
  reducedMotion: boolean;
}) {
  const { t } = useLanguage();
  const ended = view.status === 'defeated' || view.status === 'escaped';
  return (
    <>
      {cue?.kind === 'phase' && !reducedMotion && (
        <div key={cue.id} className={cn('pointer-events-none absolute inset-0 z-30 bg-neo-pink', styles.flash)} aria-hidden="true" />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-[13%] z-40 flex justify-center">
        {view.status === 'intro' && (
          <Banner tone="yellow" testId="boss-intro-banner">{t('classroomBoss.intro', { name: bossName })}</Banner>
        )}
        {!ended && cue?.kind === 'phase' && (
          <Banner key={cue.id} tone="pink" testId="boss-phase-banner">
            <Zap className="size-[2.4vw] fill-current" aria-hidden="true" />
            {cue.phase === 3 ? t('classroomBoss.enraged') : t('classroomBoss.phaseChange', { n: cue.phase })}
          </Banner>
        )}
        {!ended && cue?.kind === 'staggered' && (
          <Banner key={cue.id} tone="lime" testId="boss-stagger-banner">
            <Wind className="size-[2.4vw]" aria-hidden="true" />
            {t('classroomBoss.staggered')}
          </Banner>
        )}
        {!ended && cue?.kind === 'attack' && (() => {
          const Icon = cue.blocked ? ShieldCheck : ATTACK_ICON[cue.attack];
          return (
            <Banner key={cue.id} tone={cue.blocked ? 'cyan' : 'pink'} testId="boss-attack-banner">
              <Icon className="size-[2.4vw]" aria-hidden="true" />
              <span>
                {cue.blocked ? t('classroomBoss.blocked') : t(`classroomBoss.landed.${cue.attack}`)}
                {!cue.blocked && cue.healed > 0 && (
                  <span className="mt-[0.5vw] block text-[2.2vw] normal-case">{t('classroomBoss.healed', { n: cue.healed })}</span>
                )}
              </span>
            </Banner>
          );
        })()}
      </div>

      {ended && (
        <div data-testid={`boss-${view.status}`} className="absolute inset-0 z-40 flex flex-col items-center justify-end bg-neo-navy/30 pb-[1.5vw]">
          {view.status === 'defeated' && <BossDefeatFireworks active={!reducedMotion} bossTier="elite" />}
          <div className={cn('flex flex-col items-center gap-[1vw] rounded-[1vw] border-[0.35vw] border-neo-black bg-neo-navy-light px-[3vw] py-[1.6vw] shadow-hard-2xl', styles.slideIn)}>
            {view.status === 'defeated' && <Trophy className="size-[4vw] text-neo-yellow" strokeWidth={2.5} aria-hidden="true" />}
            <p className={cn('font-neo-display text-[4.2vw] font-black uppercase leading-none', view.status === 'defeated' ? 'text-neo-lime' : 'text-neo-pink')}>
              {view.status === 'defeated' ? t('classroomBoss.defeated', { name: bossName }) : t('classroomBoss.escaped', { name: bossName })}
            </p>
            <p className="text-[2.6vw] font-bold text-neo-white">{t('classroomBoss.dealtPct', { pct: view.pctDealt })}</p>
          </div>
        </div>
      )}
    </>
  );
});
