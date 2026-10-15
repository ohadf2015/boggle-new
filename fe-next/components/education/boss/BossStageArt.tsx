'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { BossVisualState } from '@/types/boss';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import { bossImage, bossPose } from './bossArt';
import styles from './boss.module.css';

const HURT_MS = 320;
const POSES: BossVisualState[] = ['idle', 'attack', 'hurt', 'enraged', 'defeated'];

/** The boss: all poses stay mounted and swap by opacity (no src swap flicker); hits flinch, telegraphs wind up. */
export const BossStageArt = memo(function BossStageArt({ view, reducedMotion }: { view: ClassroomBossView; reducedMotion: boolean }) {
  const lastHit = view.lastHits[0]?.id ?? 0;
  const prevHit = useRef(lastHit);
  const [hurt, setHurt] = useState(false);
  const shake = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fresh = lastHit > prevHit.current;
    prevHit.current = lastHit;
    if (!fresh) return undefined;
    setHurt(true);
    if (!reducedMotion) {
      shake.current?.animate(
        [{ transform: 'none' }, { transform: 'translateX(-2%) rotate(-1deg)' }, { transform: 'translateX(1.5%) rotate(0.6deg)' }, { transform: 'none' }],
        { duration: 220, easing: 'ease-out' },
      );
    }
    const id = window.setTimeout(() => setHurt(false), HURT_MS);
    return () => window.clearTimeout(id);
  }, [lastHit, reducedMotion]);

  const pose = bossPose(view, hurt);
  const motion = reducedMotion
    ? ''
    : view.status === 'intro'
      ? styles.intro
      : view.telegraph
        ? styles.windup
        : '';

  return (
    <div ref={shake} className="relative h-full w-full">
    <div
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
          sizes="40vw"
          className={cn('object-contain drop-shadow-[0.5vw_0.5vw_0_rgba(0,0,0,0.55)]', p === pose ? 'opacity-100' : 'opacity-0')}
        />
      ))}
    </div>
    </div>
  );
});
