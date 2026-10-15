'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Swords, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/utils/haptics/HapticsManager';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { bossImage, bossNameKey, bossPose } from './bossArt';
import { BossHpBar } from './BossHpBar';
import { PhoneBossBanner } from './PhoneBossBanner';
import { useBossCues } from './useBossCues';
import styles from './boss.module.css';

export function PhoneBossStrip() {
  const { t } = useLanguage();
  const view = useClassroomBossStore((s) => s.view);
  const myHit = useClassroomBossStore((s) => s.myHit);
  const reducedMotion = useReducedMotion();
  const cue = useBossCues(view);
  const telegraphOpen = !!view?.telegraph;
  const wasTelegraph = useRef(false);

  useEffect(() => {
    if (!myHit) return;
    void (myHit.crit ? haptics.success() : haptics.tap());
  }, [myHit]);

  useEffect(() => {
    if (telegraphOpen && !wasTelegraph.current) void haptics.warning();
    wasTelegraph.current = telegraphOpen;
  }, [telegraphOpen]);

  useEffect(() => {
    if (cue?.kind === 'attack' && !cue.blocked) void haptics.error();
  }, [cue]);

  // The blur attack smears this phone's board (the grid lives in shared game code; one scoped rule reaches it).
  const blurred = view?.effect?.kind === 'blur';

  if (!view) return null;
  const name = t(bossNameKey(view.bossId));
  const recentlyHit = !!myHit && view.lastHits[0]?.word === myHit.word;

  return (
    <div data-testid="phone-boss-strip" className="relative z-20 mx-auto w-full max-w-md px-2 pb-1">
      {blurred && <style>{'.game-board-frame{filter:blur(5px) saturate(.6);transition:filter .2s ease-out}'}</style>}
      <div className="flex items-center gap-2 rounded-neo border-[3px] border-neo-cream/50 bg-neo-navy-light p-1.5 shadow-hard-lg">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-[10px] border-2 border-neo-black bg-neo-purple-dark">
          <Image src={bossImage(view.bossId, bossPose(view, recentlyHit))} alt="" fill sizes="48px" className="object-cover object-top" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <p dir="auto" className="truncate font-neo-display text-sm font-black leading-tight text-neo-white">{name}</p>
            <span className={cn('shrink-0 rounded-full border-2 border-neo-black px-1.5 text-[10px] font-black uppercase leading-4', view.phase === 3 ? 'bg-neo-red text-neo-white' : 'bg-neo-navy text-neo-white/90')}>
              {t('classroomBoss.phaseShort', { n: view.phase })}
            </span>
          </div>
          <div className="mt-1">
            <BossHpBar hp={view.hp} maxHp={view.maxHp} phase={view.phase} size="strip" label={name} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5" data-testid="phone-boss-stats">
          <span className="flex items-center gap-1 text-neo-lime" title={t('classroomBoss.yourDamage')}>
            <Swords className="size-3.5" strokeWidth={3} aria-hidden="true" />
            <span className="sr-only">{t('classroomBoss.yourDamage')}</span>
            <span dir="ltr" className="font-neo-display text-base font-black leading-none tabular-nums">{myHit?.totalDmg ?? 0}</span>
          </span>
          <span className={cn('flex items-center gap-1', view.combo.multiplier > 1 ? 'text-neo-orange' : 'text-neo-white/50')}>
            <Flame className={cn('size-3.5', view.combo.multiplier > 1 && 'fill-current')} aria-hidden="true" />
            <span className="sr-only">{t('classroomBoss.combo')}</span>
            <span dir="ltr" className="font-neo-display text-base font-black leading-none">x{view.combo.multiplier}</span>
          </span>
        </div>
      </div>

      {myHit && (
        <span
          key={myHit.id}
          data-testid="phone-boss-pop"
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute end-3 top-0 rounded-full border-2 border-neo-black px-3 py-0.5 font-neo-display text-sm font-black shadow-hard',
            myHit.crit ? 'bg-neo-pink text-neo-black' : 'bg-neo-lime text-neo-black',
            !reducedMotion && styles.pop,
            reducedMotion && 'hidden',
          )}
        >
          {myHit.crit ? t('classroomBoss.critDamage', { n: myHit.dmg }) : t('classroomBoss.plusDamage', { n: myHit.dmg })}
        </span>
      )}
      {/* A fixed-height lane: warnings never shift the board or sit on the round's own callouts. */}
      <div className="pointer-events-none mt-1 flex h-7 items-center justify-center">
        <PhoneBossBanner view={view} cue={cue} />
      </div>
    </div>
  );
}
