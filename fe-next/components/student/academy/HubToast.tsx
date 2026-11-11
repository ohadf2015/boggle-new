'use client';

import Image from 'next/image';
import { AnimatePresence, m } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomReward } from '@/hooks/useClassroomRewardListener';
import { cn } from '@/lib/utils';
import { InkPanel } from './chrome';

export type HubNote = { kind: 'arena' } | { kind: 'boss'; left: number } | null;

interface Props {
  reward: ClassroomReward | null;
  note: HubNote;
  onDismiss: () => void;
  reducedMotion: boolean;
  rail: boolean;
}

/** The round payout and the locked-island notes, dropped under the HUD. */
export function HubToast({ reward, note, onDismiss, reducedMotion, rail }: Props) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {(reward || note) && (
        <m.div
          key={reward ? 'reward' : note?.kind}
          role="status"
          aria-live="polite"
          initial={reducedMotion ? false : { y: -16, scale: 0.9 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: -8, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className={cn('absolute inset-x-3 z-30 mx-auto max-w-sm', rail ? 'top-16' : 'top-[8.5rem] sm:top-36')}
        >
          {reward ? (
            <InkPanel tone="lime" className="flex items-center justify-center gap-2 px-4 py-2 font-neo-display font-black text-neo-black">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <span className="text-lg uppercase">{t('academy.student.rewardXp', '+{xp} XP', { xp: reward.xpEarned })}</span>
              <button type="button" onClick={onDismiss} className="ms-1 inline-flex min-h-11 min-w-11 items-center justify-center text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black" aria-label={t('common.dismiss', 'Dismiss')}>×</button>
            </InkPanel>
          ) : (
            <InkPanel tone="night" className="flex items-center gap-3 p-2 pe-3">
              <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-[10px] border-2 border-neo-black">
                <Image
                  src={note?.kind === 'arena' ? '/images/education/waiting-for-teacher.webp' : '/images/education/node-boss.webp'}
                  alt=""
                  aria-hidden="true"
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-cover"
                />
              </span>
              <span dir="auto" className="font-neo-body text-sm font-bold leading-snug text-neo-white">
                {note?.kind === 'arena'
                  ? t('academy.student.arenaWaiting', "Your teacher hasn't started a live game yet. This island lights up when they do.")
                  : t('academy.student.bossLockedNote', 'Master {count} more words to unlock the boss.', {
                      count: note?.kind === 'boss' ? note.left : 0,
                    })}
              </span>
            </InkPanel>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
