'use client';

import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DailyModeId } from '@/lib/dailyModes';

export interface JourneyStep {
  id: DailyModeId;
  title: string;
  icon: ReactNode;
  artUrl: string;
  played: boolean;
  optional: boolean;
  onPlay: () => void;
}

interface DailyJourneyProps {
  steps: JourneyStep[];
  currentId: DailyModeId | null;
}

/**
 * The day at a glance: the four daily challenges in play order
 * (Word Wheel → Word Hunt → Connections → Word Tower), each tappable, each
 * labelled required or optional, the current one highlighted. Every step is
 * always reachable — optional steps can be skipped by simply not tapping them.
 */
export function DailyJourney({ steps, currentId }: DailyJourneyProps) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t('daily.dailyMissions')} className="w-full" data-testid="daily-journey">
      <ol className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {/* connector line behind the nodes */}
        <span aria-hidden className="absolute top-7 inset-x-[12%] h-1 rounded-full bg-black/40" />
        {steps.map((step, i) => {
          const isNow = step.id === currentId && !step.played;
          return (
            <li key={step.id} className="relative flex flex-col items-center" data-testid={`journey-step-${step.id}`} data-step={i + 1} data-optional={step.optional ? 'true' : 'false'} data-state={step.played ? 'done' : isNow ? 'now' : 'todo'}>
              <m.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 360, damping: 22 }}
              >
              <button
                type="button"
                onClick={step.onPlay}
                className={cn(
                  'relative w-14 h-14 rounded-full border-3 border-black overflow-hidden shadow-hard-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime',
                  step.played ? 'grayscale-[40%]' : '',
                  isNow ? 'ring-4 ring-neo-lime/70 scale-110' : '',
                  step.optional && !step.played && !isNow ? 'border-dashed opacity-90' : '',
                )}
                aria-label={`${t('daily.journeyStep')} ${i + 1}: ${step.title}`}
                aria-current={isNow ? 'step' : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbnail */}
                <img src={step.artUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                <span className="absolute top-0.5 start-0.5 min-w-5 h-5 px-1 rounded-full bg-neo-black text-neo-white text-[11px] font-black leading-5 text-center">{i + 1}</span>
                {step.played && (
                  <span className="absolute inset-0 flex items-center justify-center bg-neo-lime/70">
                    <span aria-hidden className="text-3xl font-black text-neo-black leading-none">✓</span>
                  </span>
                )}
              </button>
              </m.div>
              <span className="mt-1.5 text-[11px] font-black text-neo-white text-center leading-tight line-clamp-2">{step.title}</span>
              <span
                className={cn(
                  'mt-1 px-1.5 py-0.5 rounded-full border-2 border-black text-[9px] font-black uppercase leading-none',
                  step.played ? 'bg-neo-lime text-neo-black' : isNow ? 'bg-neo-yellow text-neo-black' : step.optional ? 'bg-white/10 text-neo-cream' : 'bg-neo-pink text-neo-white',
                )}
              >
                {step.played ? t('daily.journeyDone') : isNow ? t('daily.journeyNow') : step.optional ? t('daily.journeyOptional') : t('daily.journeyRequired')}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default DailyJourney;
