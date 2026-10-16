'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { bossNameKey } from './bossArt';
import { BossStageArt } from './BossStageArt';
import { BossHpBar } from './BossHpBar';
import { BossTopHitters } from './BossTopHitters';
import { BossAttackClock } from './BossAttackClock';
import { BossShieldMeter } from './BossShieldMeter';
import { BossProjectiles } from './BossProjectiles';
import { BossStageFooter } from './BossStageFooter';
import { BossStageOverlays } from './BossStageOverlays';
import { useBossCues } from './useBossCues';
import { useBossStageSounds } from './useBossStageSounds';

const ARENA = '/images/education/v2/boss-arena-bg.webp';

interface ProjectorBossStageProps {
  remainingTime: number;
  trailing?: ReactNode;
  style?: React.CSSProperties;
}

export function ProjectorBossStage({ remainingTime, trailing, style }: ProjectorBossStageProps) {
  const { t } = useLanguage();
  const view = useClassroomBossStore((s) => s.view);
  const reducedMotion = useReducedMotion();
  const cue = useBossCues(view);
  useBossStageSounds(view, cue);
  if (!view) return null;
  const bossName = t(bossNameKey(view.bossId));
  const hpPct = Math.round((view.hp / Math.max(1, view.maxHp)) * 100);

  return (
    <div data-testid="projector-boss-stage" className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy" style={style}>
      <Image src={ARENA} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-neo-navy/35" aria-hidden="true" />

      <div className="relative min-h-0 flex-1">
      <header className="relative z-20 flex items-start justify-center px-[2vw] pt-[1.2vw]">
        <h1 dir="auto" className="font-neo-display text-[4.2vw] font-black uppercase leading-none tracking-wide text-neo-cream [text-shadow:0.25vw_0.25vw_0_#000]">
          {bossName}
        </h1>
        {trailing && <div className="absolute end-[1.5vw] top-[1vw] flex gap-2">{trailing}</div>}
      </header>

      <aside className="absolute start-[1.5vw] top-[5.5vw] z-20 w-[24vw]">
        <BossTopHitters hitters={view.topHitters} />
      </aside>

      <aside className="absolute end-[1.5vw] top-[5.5vw] z-20 flex w-[21vw] flex-col gap-[3.2vw]">
        <BossAttackClock view={view} />
        <BossShieldMeter shield={view.shield} max={view.shieldMax} />
      </aside>

      <div className="absolute inset-x-[25%] top-[6vw] bottom-[20vw] z-10">
        <BossStageArt view={view} reducedMotion={reducedMotion} />
      </div>

      <div className="absolute inset-x-[28%] bottom-[13.5vw] z-20 flex flex-col items-center gap-[0.5vw]">
        <p className="rounded-[0.5vw] border-[0.2vw] border-neo-black bg-neo-navy-light px-[1.2vw] py-[0.3vw] font-neo-display text-[2.3vw] font-black uppercase text-neo-white shadow-hard-lg">
          {t('classroomBoss.phase', { n: view.phase })}
        </p>
        <BossHpBar hp={view.hp} maxHp={view.maxHp} phase={view.phase} size="stage" label={bossName} />
        <p className="font-neo-display text-[2.2vw] font-black uppercase text-neo-white [text-shadow:0.15vw_0.15vw_0_#000]">
          {t('classroomBoss.hpLeft', { pct: hpPct })}
        </p>
      </div>

      <BossProjectiles hits={view.lastHits} />

      <div className="absolute inset-x-0 bottom-[1.2vw] z-20">
        <BossStageFooter remainingTime={remainingTime} comboCount={view.combo.count} multiplier={view.combo.multiplier} />
      </div>

      <BossStageOverlays view={view} cue={cue} bossName={bossName} reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}
