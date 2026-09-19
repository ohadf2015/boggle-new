'use client';

/** Tappable potion flask with its count. Drinking pops it and plays a cue. */
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { PotionId } from '@/lib/adventure/play/relics';
import { potionArt } from './art';
import { cn } from '@/lib/utils';

interface Props {
  id: PotionId;
  count: number;
  disabled: boolean;
  onDrink: (id: PotionId) => boolean | void;
}

export default function PotionButton({ id, count, disabled, onDrink }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const [gulp, setGulp] = useState(0);
  const name = t(`adventurePlay.potion.${id}`);
  return (
    <motion.button
      key={gulp}
      type="button"
      data-potion={id}
      disabled={disabled}
      onClick={() => { if (onDrink(id) !== false) setGulp((g) => g + 1); }}
      aria-label={`${name} (${count}): ${t(`adventurePlay.potionDesc.${id}`)}`}
      title={t(`adventurePlay.potionDesc.${id}`)}
      initial={gulp && !reduce ? { scale: 1.35, rotate: -18 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 12 }}
      className={cn('relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-neo-navy-light shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none disabled:opacity-40')}
      style={{ backgroundColor: '#1b2a5c' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
      <img src={potionArt(id)} alt="" draggable={false} className="h-8 w-8 object-contain" />
      <span className="absolute -bottom-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-black bg-neo-lime px-1 text-[10px] font-black text-black tabular-nums">
        {count}
      </span>
    </motion.button>
  );
}
