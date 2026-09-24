/**
 * ClassChest — the reward the CLASS earns together, on the podium stage.
 *
 * A single child wins the gold pedestal; the chest is everybody's: it wiggles
 * shut through the reveal and pops open on the winner's beat to spill the
 * class's haul — how many lesson words the room found between them, counted
 * up. It is SILENT on purpose: the round-end screen has exactly one sound
 * (the winner sting or the sweep chime, see `roundEndOneCue`), and a chest
 * pop half a second later would be the "it screamed at us" bug again.
 *
 * Transform-only motion (scale / rotate), never an opacity entrance (Class 5);
 * under reduced motion it is simply open or shut.
 */

'use client';

import { m, useReducedMotion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import { tr, type EduT } from '@/components/education/lobby/eduText';

export interface ClassChestProps {
  /** Lesson words the class found between them this round. */
  found: number;
  total: number;
  open: boolean;
  t: EduT;
}

export function ClassChest({ found, total, open, t }: ClassChestProps) {
  const reduceMotion = useReducedMotion();
  const shown = useCountUp({ target: open ? found : 0, duration: 1300, startDelay: 250, immediate: !!reduceMotion });

  return (
    <div
      data-testid="class-chest"
      data-open={open ? 'true' : 'false'}
      className="absolute flex flex-col items-center"
      style={{ left: '2.5%', bottom: '4%', width: '17%' }}
    >
      <m.div
        className="w-full"
        initial={false}
        animate={
          reduceMotion
            ? { scale: 1, rotate: 0 }
            : open
              ? { scale: [1, 1.25, 1.05], rotate: [0, -6, 0] }
              : { rotate: [0, -4, 4, -3, 0] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : open
              ? { duration: 0.6, ease: 'easeOut' }
              : { duration: 0.8, repeat: Infinity, repeatDelay: 1.1 }
        }
      >
        <img
          src="/images/education/chest-books.webp"
          alt=""
          aria-hidden="true"
          className="w-full select-none drop-shadow-[0.4cqw_0.4cqw_0_#000]"
        />
      </m.div>
      <div
        className="-mt-[1cqw] flex flex-col items-center rounded-neo border-[3px] border-neo-black bg-neo-lime px-[1cqw] py-[0.3cqw] text-neo-black shadow-[0.35cqw_0.35cqw_0_#000]"
      >
        <span className="font-neo-display font-black uppercase leading-none" style={{ fontSize: '1.2cqw' }}>
          {tr(t, 'academy.results.classChest', 'Class chest')}
        </span>
        <span className="font-neo-display font-black tabular-nums leading-tight" style={{ fontSize: '2.2cqw' }}>
          <span aria-hidden="true">{open ? `+${shown}` : '?'}</span>
          <span className="sr-only">{open ? found : ''}</span>
        </span>
        {open && total > 0 && (
          <span className="font-neo-body font-bold leading-tight" style={{ fontSize: '1cqw' }}>
            {tr(t, 'academy.results.classChestWords', 'words found of {{total}}', { total })}
          </span>
        )}
      </div>
    </div>
  );
}

export default ClassChest;
