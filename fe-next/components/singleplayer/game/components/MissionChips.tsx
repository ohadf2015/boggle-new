'use client';

import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { SoloMission } from '@/lib/soloMissions';

interface MissionChipsProps {
  missions: readonly SoloMission[];
}

/**
 * Three mission chips. Labels wrap to two lines (a truncated goal is not a
 * goal), progress is a bar plus an LTR `3/10` so Hebrew doesn't scramble it.
 * Completion pops once, then sits lime.
 */
export function MissionChips({ missions }: MissionChipsProps) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  if (missions.length === 0) return null;

  return (
    <div className="flex w-full gap-1.5" data-testid="mission-chips">
      {missions.map((mission) => (
        <motion.div
          key={mission.id}
          data-testid={`mission-${mission.id}`}
          data-done={mission.done ? 'true' : 'false'}
          variants={{
            idle: { scale: 1 },
            done: { scale: [1, 1.12, 1] },
          }}
          initial="idle"
          animate={mission.done && !reduce ? 'done' : 'idle'}
          transition={{ duration: 0.35 }}
          className={cn(
            'relative min-w-0 flex-1 overflow-hidden rounded-lg border-[3px] border-neo-black px-2 pb-2 pt-1 shadow-[2px_2px_0_#000]',
            mission.done ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-white',
          )}
        >
          <span className="flex items-start justify-between gap-1">
            <span data-part="label" className="line-clamp-2 text-[11px] font-black uppercase leading-[1.15]">
              {t(mission.labelKey, mission.letter ? { letter: mission.letter } : undefined)}
            </span>
            {mission.done ? (
              <Check className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={3.5} aria-label={t('singlePlayer.missions.done')} />
            ) : (
              <span dir="ltr" className="shrink-0 text-[11px] font-bold tabular-nums text-neo-cyan">
                {mission.progress}/{mission.target}
              </span>
            )}
          </span>
          {/* Progress bar along the chip's foot. */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <span
              data-part="bar"
              className={cn('block h-full transition-[width] duration-300', mission.done ? 'bg-neo-black/30' : 'bg-neo-cyan')}
              style={{ width: `${Math.min(100, Math.round((mission.progress / Math.max(1, mission.target)) * 100))}%` }}
            />
          </span>
        </motion.div>
      ))}
    </div>
  );
}
