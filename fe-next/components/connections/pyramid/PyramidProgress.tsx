'use client';

import { m } from 'framer-motion';

interface PyramidProgressProps {
  stage: number;
  solvedBridges: string[];
  gaveUpBase: [boolean, boolean, boolean];
  metaAnswer: string;
  won: boolean;
}

/**
 * Visual pyramid: apex shows the finale answer (? until won/lost revealed),
 * base shows 3 solved bridges as colored slots (lime if solved, red if gave up).
 */
export default function PyramidProgress({
  stage,
  solvedBridges,
  gaveUpBase,
  metaAnswer,
  won,
}: PyramidProgressProps) {
  const showFinale = stage === 3;
  const finaleRevealed = won;

  // Solved bridges so far (base[0], base[1], base[2])
  const bridge0 = solvedBridges[0];
  const bridge1 = solvedBridges[1];
  const bridge2 = solvedBridges[2];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Apex (finale) */}
      {showFinale && (
        <m.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={[
            'w-24 h-24 rounded-neo border-neo-thick flex items-center justify-center font-neo-display font-bold text-xl shadow-hard',
            finaleRevealed
              ? 'border-neo-lime bg-neo-lime/20 text-neo-lime'
              : 'border-neo-purple/70 bg-neo-purple/10 text-neo-purple',
          ].join(' ')}
        >
          {finaleRevealed ? (
            <m.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14 }}
            >
              {metaAnswer}
            </m.span>
          ) : (
            <m.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              ?
            </m.span>
          )}
        </m.div>
      )}

      {/* Base: 3 bridge slots */}
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map((idx) => {
          const bridge = [bridge0, bridge1, bridge2][idx];
          const gaveUp = gaveUpBase[idx];
          const solved = !!bridge && !gaveUp;

          return (
            <m.div
              key={idx}
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
              className={[
                'w-20 h-20 rounded-neo border-neo-thick flex items-center justify-center font-neo-body text-xs font-bold text-center px-2 shadow-hard',
                bridge
                  ? solved
                    ? 'border-neo-lime bg-neo-lime/20 text-neo-lime'
                    : 'border-neo-red bg-neo-red/20 text-neo-red'
                  : 'border-neo-white/20 bg-neo-navy-light text-neo-white/40',
              ].join(' ')}
            >
              {bridge ? bridge : '?'}
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
