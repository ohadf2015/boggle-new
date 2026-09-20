'use client';

import { motion } from 'framer-motion';
import { districtReward } from '@/lib/wordTowerV2/estate';
import { ITEM, backdropFor } from './estateArt';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  /** The district that was just finished. */
  district: number;
  doneName: string;
  nextName: string;
  reducedMotion: boolean;
  onContinue: () => void;
}

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  x: (i % 7) * 14 - 42,
  delay: i * 0.04,
  hue: ['bg-neo-lime', 'bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow'][i % 4],
}));

/** Five landmarks done: the district is finished and the next skyline opens. */
export function DistrictComplete({ t, district, doneName, nextName, reducedMotion, onContinue }: Props) {
  const reward = districtReward(district);
  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-neo-navy/85 p-4" role="dialog" aria-modal="true">
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-neo border-neo-thick border-black bg-neo-cream text-center text-neo-navy shadow-hard-lg"
        initial={reducedMotion ? false : { scale: 0.8, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <div className="relative h-28 w-full border-b-4 border-black bg-neo-navy">
          <div className="absolute inset-0 bg-cover bg-bottom" style={{ backgroundImage: `url(${backdropFor(district + 1)})` }} aria-hidden />
          {!reducedMotion
            ? CONFETTI.map((c, i) => (
                <motion.span
                  key={i}
                  className={`absolute left-1/2 top-0 h-3 w-2 border-2 border-black ${c.hue}`}
                  initial={{ y: -12, x: c.x, rotate: 0, opacity: 1 }}
                  animate={{ y: 120, rotate: 220, opacity: 0 }}
                  transition={{ duration: 1.1, delay: c.delay, ease: 'easeIn' }}
                />
              ))
            : null}
        </div>
        <div className="p-5">
          <h2 className="font-neo-display text-2xl font-black uppercase">{t('wordTowerV2.estate.completeTitle', { name: doneName })}</h2>
          <p className="mt-1 font-neo-display text-sm font-bold opacity-80">{t('wordTowerV2.estate.completeSub')}</p>
          <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-neo border-neo border-black bg-neo-yellow px-3 py-1.5 font-neo-display text-sm font-black shadow-hard-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ITEM.coinStack} alt="" aria-hidden className="h-6 w-6" />
            {t('wordTowerV2.estate.reward', { coins: reward.coins.toLocaleString() })}
          </div>
          <div className="mt-4 rounded-neo border-neo border-black bg-neo-navy px-3 py-2 font-neo-display text-base font-black text-neo-lime">
            {t('wordTowerV2.estate.completeNext', { name: nextName })}
          </div>
          <button
            type="button"
            onClick={onContinue}
            autoFocus
            className="mt-4 w-full rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            {t('wordTowerV2.estate.completeCta', { name: nextName })}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
