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
 * Three slim mission chips. Progress numbers stay LTR so Hebrew doesn't
 * scramble `3/10`. Completion pops once, then sits lime.
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
            'min-w-0 flex-1 rounded-neo border-2 px-1.5 py-1',
            mission.done
              ? 'border-neo-black bg-neo-lime text-neo-black'
              : 'border-neo-white bg-neo-navy-light text-neo-white',
          )}
        >
          <span className="block truncate text-[10px] font-black uppercase leading-tight">
            {t(mission.labelKey, mission.letter ? { letter: mission.letter } : undefined)}
          </span>
          <span className="mt-0.5 flex items-center gap-1">
            <span dir="ltr" className="text-[10px] font-bold">
              {mission.progress}/{mission.target}
            </span>
            {mission.done ? (
              <Check className="h-3 w-3 shrink-0" aria-label={t('singlePlayer.missions.done')} />
            ) : null}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
