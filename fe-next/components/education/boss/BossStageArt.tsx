'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { BossVisualState } from '@/types/boss';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import { bossImage, bossPose } from './bossArt';
import { bossImpactBus } from './fx/bossFxBus';
import styles from './boss.module.css';

const HURT_MS = 320;
const POSES: BossVisualState[] = ['idle', 'attack', 'hurt', 'enraged', 'defeated'];
const AURA: Record<string, string> = {
  freeze: 'rgb(63 216 255 / 0.55)',
  blur: 'rgb(168 85 247 / 0.55)',
  drain: 'rgb(255 79 163 / 0.55)',
  exposed: 'rgb(255 209 102 / 0.6)',
  enraged: 'rgb(255 60 30 / 0.4)',
  calm: 'rgb(124 92 255 / 0.28)',
};

/** The boss: all poses stay mounted and swap by opacity (no src swap flicker); it breathes, flinches on impact and dies on screen. */
export const BossStageArt = memo(function BossStageArt({ view, reducedMotion }: { view: ClassroomBossView; reducedMotion: boolean }) {
  const [hurt, setHurt] = useState(false);
  const knock = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = 0;
    const off = bossImpactBus.on(({ crit }) => {
      setHurt(true);
      window.clearTimeout(id);
      id = window.setTimeout(() => setHurt(false), HURT_MS);
      if (reducedMotion) return;
      knock.current?.animate(
        crit
          ? [{ transform: 'none' }, { transform: 'translate(2%, -2%) rotate(3deg) scale(0.94, 1.06)' }, { transform: 'translate(-1%, 0) rotate(-1.5deg)' }, { transform: 'none' }]
          : [{ transform: 'none' }, { transform: 'translateY(-1.2%) scale(0.97, 1.03)' }, { transform: 'none' }],
        { duration: crit ? 380 : 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      );
      flash.current?.animate([{ filter: 'brightness(2.4) saturate(0.2)' }, { filter: 'none' }], { duration: crit ? 200 : 120, easing: 'ease-out' });
    });
    return () => {
      off();
      window.clearTimeout(id);
    };
  }, [reducedMotion]);

  const pose = bossPose(view, hurt);
  const defeated = view.status === 'defeated';
  const auraKey = defeated ? null : view.exposed ? 'exposed' : view.telegraph ? view.telegraph.kind : view.phase === 3 ? 'enraged' : 'calm';
  const motion = reducedMotion
    ? ''
    : defeated
      ? styles.death
      : view.status === 'intro'
        ? styles.intro
        : view.exposed
          ? styles.wobble
          : view.telegraph
            ? styles.windup
            : '';

  return (
    <div className="relative h-full w-full">
      {auraKey && (
        <div
          aria-hidden="true"
          className={cn('absolute inset-[-8%] rounded-full', !reducedMotion && styles.aura)}
          style={{ background: `radial-gradient(closest-side, ${AURA[auraKey]}, transparent 72%)` }}
        />
      )}
      <div aria-hidden="true" className={cn('absolute inset-x-[14%] bottom-[1%] h-[9%] rounded-[50%] bg-neo-black/60 blur-[1.2cqw]', !reducedMotion && !defeated && styles.shadowBreathe)} />
      <div ref={knock} className="relative h-full w-full">
        <div className={cn('relative h-full w-full', !reducedMotion && !defeated && styles.breathe)}>
          <div
            ref={flash}
            data-testid="boss-art"
            data-pose={pose}
            className={cn('relative h-full w-full', motion, view.status === 'escaped' && 'opacity-60')}
          >
            {POSES.map((p) => (
              <Image
                key={p}
                src={bossImage(view.bossId, p)}
                alt=""
                fill
                priority={p === 'idle'}
                loading={p === 'idle' ? undefined : 'eager'}
                sizes="45vw"
                className={cn('object-contain object-bottom drop-shadow-[0.5cqw_0.5cqw_0_rgba(0,0,0,0.55)]', p === pose ? 'opacity-100' : 'opacity-0')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
