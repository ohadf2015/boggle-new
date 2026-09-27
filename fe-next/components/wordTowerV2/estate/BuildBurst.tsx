'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ITEM } from './estateArt';

interface Props {
  show: boolean;
  kind: 'build' | 'repair';
  /** Coins actually spent — they fly out of the plot. 0 draws none. */
  cost: number;
  label: string;
  reducedMotion: boolean;
  onDone: () => void;
}

const STARS = [
  { x: -46, y: -54, s: 1 },
  { x: 40, y: -66, s: 0.8 },
  { x: -18, y: -86, s: 0.6 },
  { x: 58, y: -26, s: 0.7 },
  { x: -62, y: -18, s: 0.5 },
  { x: 14, y: -104, s: 0.45 },
];

/**
 * The payoff for spending: dust at the footing, stars over the roof and the
 * coins you just paid flying out of the plot. Reduced motion gets the banner
 * only — no movement, same information.
 */
export function BuildBurst({ show, kind, cost, label, reducedMotion, onDone }: Props) {
  const coins = Math.min(5, Math.max(0, Math.round(cost / 80)));
  return (
    <AnimatePresence onExitComplete={onDone}>
      {show ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center">
          {!reducedMotion ? (
            <>
              <motion.img
                src={ITEM.dust}
                alt=""
                aria-hidden
                className="absolute bottom-0 w-[150%] max-w-none"
                initial={{ opacity: 0.95, scaleX: 0.5, scaleY: 0.7, y: 6 }}
                animate={{ opacity: 0, scaleX: 1.5, scaleY: 1.1, y: -6 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
              {STARS.map((s, i) => (
                <motion.img
                  key={i}
                  src={ITEM.star}
                  alt=""
                  aria-hidden
                  className="absolute bottom-1/3 h-8 w-8"
                  initial={{ opacity: 0, scale: 0.2, x: 0, y: 0, rotate: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: s.s, x: s.x, y: s.y, rotate: 90 }}
                  transition={{ duration: 0.75, delay: i * 0.05, ease: 'easeOut' }}
                />
              ))}
              {Array.from({ length: coins }, (_, i) => (
                <motion.img
                  key={`c${i}`}
                  src={ITEM.coin}
                  alt=""
                  aria-hidden
                  className="absolute bottom-1/2 h-7 w-7"
                  initial={{ opacity: 1, x: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, x: (i - (coins - 1) / 2) * 34, y: -96, scale: 1.1 }}
                  transition={{ duration: 0.6, delay: 0.05 * i, ease: 'easeOut' }}
                />
              ))}
            </>
          ) : null}
          <motion.div
            className={`absolute bottom-[45%] rounded-neo border-neo-thick border-black px-2.5 py-1 font-neo-display text-sm font-black text-neo-navy shadow-hard ${kind === 'build' ? 'bg-neo-lime' : 'bg-neo-cyan'}`}
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: -14 }}
            exit={{ opacity: 0, y: -26 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {label}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
