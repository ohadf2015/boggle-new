'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Mascot } from '@/components/ui/Mascot';
import { NEO_BLOCK_TONES, type NeoBlockTone } from '@/components/ui/neoStyles';
import { useSkipAnimations } from './AdaptiveMotion';
import { BoundedConfettiBurst } from './BoundedConfettiBurst';
import { CountUp } from './CountUp';
import { MascotRig, type MascotRigState } from './MascotRig';
import { PopIn, Stagger } from './PopIn';

export interface CelebrationStat {
  key: string;
  label: ReactNode;
  value: number;
  format?: (value: number) => string;
  tone?: NeoBlockTone;
}

export interface CelebrationMomentProps {
  headline: ReactNode;
  subline?: ReactNode;
  stats?: CelebrationStat[];
  continueLabel: ReactNode;
  onContinue: () => void;
  mascot?: ReactNode;
  mascotState?: MascotRigState;
  confetti?: boolean;
  children?: ReactNode;
  className?: string;
}

export function CelebrationMoment({
  headline,
  subline,
  stats = [],
  continueLabel,
  onContinue,
  mascot,
  mascotState = 'hop',
  confetti = true,
  children,
  className,
}: CelebrationMomentProps) {
  const skip = useSkipAnimations();

  return (
    <section className={cn('flex w-full flex-col items-center gap-5 text-center', className)}>
      <BoundedConfettiBurst trigger={confetti && !skip} size="md">
        <div className="px-10 pt-8">
          <MascotRig state={mascotState}>{mascot ?? <Mascot variant="celebration" size="md" animated={false} />}</MascotRig>
        </div>
      </BoundedConfettiBurst>
      <PopIn>
        <h2 className="font-neo-display text-3xl font-black leading-tight text-neo-cream">{headline}</h2>
        {subline && <p className="mt-1 text-base font-bold text-neo-cream/80">{subline}</p>}
      </PopIn>
      {stats.length > 0 && (
        <Stagger as="ul" itemAs="li" delay={0.15} className="flex flex-wrap justify-center gap-3">
          {stats.map((stat, i) => (
            <div
              key={stat.key}
              className={cn(
                'flex min-w-24 flex-col items-center rounded-neo border-3 px-4 py-2 shadow-hard',
                NEO_BLOCK_TONES[stat.tone ?? 'cream'],
              )}
            >
              <span className="text-xs font-black uppercase tracking-wide">{stat.label}</span>
              <CountUp value={stat.value} delay={300 + i * 120} formatValue={stat.format} size="xl" className="text-current" />
            </div>
          ))}
        </Stagger>
      )}
      {children}
      <Button press="chunky" variant="success" size="lg" onClick={onContinue} className="w-full max-w-sm">
        {continueLabel}
      </Button>
    </section>
  );
}
