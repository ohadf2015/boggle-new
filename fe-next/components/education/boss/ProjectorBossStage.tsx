'use client';

import { useRef, type ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { bossNameKey } from './bossArt';
import { BossStageArt } from './BossStageArt';
import { BossHpBar } from './BossHpBar';
import { BossTopHitters } from './BossTopHitters';
import { BossAttackClock } from './BossAttackClock';
import { BossShieldMeter } from './BossShieldMeter';
import { BossStageFooter } from './BossStageFooter';
import { BossStageOverlays } from './BossStageOverlays';
import { BossExposedChip } from './BossExposedChip';
import { BossFxLayer } from './fx/BossFxLayer';
import { useBossCues } from './useBossCues';
import { useBossStageSounds } from './useBossStageSounds';

const ARENA = '/images/education/v2/boss-arena-bg.webp';
const PHASE_TINT = ['', 'bg-neo-pink/10', 'bg-neo-red/20'];

interface ProjectorBossStageProps {
  remainingTime: number;
  trailing?: ReactNode;
  style?: React.CSSProperties;
}

/**
 * The arena bleeds to every edge; the fight itself lives in a letterboxed 16:9 canvas sized in cqw, so a 4:3
 * projector or a short laptop window scales the scene instead of piling the HUD onto the boss.
 */
export function ProjectorBossStage({ remainingTime, trailing, style }: ProjectorBossStageProps) {
  const { t } = useLanguage();
  const view = useClassroomBossStore((s) => s.view);
  const reducedMotion = useReducedMotion();
  const cue = useBossCues(view);
  const shakeRef = useRef<HTMLDivElement>(null);
  useBossStageSounds(view, cue);
  if (!view) return null;
  const bossName = t(bossNameKey(view.bossId));
  // Once the fight is over the outcome stamp is the hero: the live HUD steps back.
  const hud = cn('transition-opacity duration-700', (view.status === 'defeated' || view.status === 'escaped') && 'opacity-30');

  return (
    <div data-testid="projector-boss-stage" className="relative isolate flex min-h-0 flex-1 overflow-hidden bg-neo-navy [container-type:size]" style={style}>
      <Image src={ARENA} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_42%,transparent_30%,rgb(8_10_30/0.82)_100%)]" aria-hidden="true" />
      <div className={cn('pointer-events-none absolute inset-0 -z-10 transition-colors duration-700', PHASE_TINT[view.phase - 1])} aria-hidden="true" />
      {trailing && <div className="absolute end-3 top-3 z-50 flex gap-2">{trailing}</div>}

      <div className="m-auto aspect-video w-[min(100cqw,calc(100cqh*16/9))] [container-type:inline-size]">
        <div ref={shakeRef} className="relative h-full w-full">
          <header className="absolute inset-x-[22%] top-[1.6cqw] z-20">
            <div className="mb-[0.6cqw] flex items-end justify-between gap-[1cqw]">
              <h1 dir="auto" className="truncate font-neo-display text-[3cqw] font-black uppercase leading-none tracking-wide text-neo-cream [text-shadow:0.22cqw_0.22cqw_0_#000]">
                {bossName}
              </h1>
              <PhasePips phase={view.phase} label={t('classroomBoss.phase', { n: view.phase })} />
            </div>
            <BossHpBar hp={view.hp} maxHp={view.maxHp} phase={view.phase} size="stage" label={bossName} />
            <div className="mt-[0.8cqw] flex justify-center">
              <BossExposedChip view={view} />
            </div>
          </header>

          <aside className={cn('absolute start-[1.4cqw] top-[1.6cqw] z-20 w-[19.5cqw]', hud)}>
            <BossTopHitters hitters={view.topHitters} />
          </aside>

          <aside className={cn('absolute end-[1.4cqw] top-[5cqw] z-20 flex w-[18cqw] flex-col gap-[1.4cqw]', hud)}>
            <BossAttackClock view={view} />
            <BossShieldMeter shield={view.shield} max={view.shieldMax} />
          </aside>

          <div className="absolute inset-x-[27%] top-[11cqw] bottom-[9.5cqw] z-10">
            <BossStageArt view={view} reducedMotion={reducedMotion} />
          </div>

          <BossFxLayer reducedMotion={reducedMotion} shakeRef={shakeRef} />

          <div className={cn('absolute inset-x-0 bottom-[1.2cqw] z-20', hud)}>
            <BossStageFooter remainingTime={remainingTime} comboCount={view.combo.count} multiplier={view.combo.multiplier} />
          </div>

          <BossStageOverlays view={view} cue={cue} bossName={bossName} reducedMotion={reducedMotion} />
        </div>
      </div>
    </div>
  );
}

function PhasePips({ phase, label }: { phase: number; label: string }) {
  return (
    <div className="flex shrink-0 items-center gap-[0.5cqw]" role="img" aria-label={label}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            'size-[1.5cqw] rotate-45 border-[0.2cqw] border-neo-black transition-colors duration-500',
            n < phase ? 'bg-neo-black/60' : n === phase ? (phase === 3 ? 'bg-neo-red' : 'bg-neo-yellow') : 'bg-neo-cream/80',
          )}
        />
      ))}
    </div>
  );
}
