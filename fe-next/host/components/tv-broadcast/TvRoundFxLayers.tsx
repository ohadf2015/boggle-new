'use client';

import { memo } from 'react';
import Image from 'next/image';
import { AnimatePresence, m } from 'framer-motion';

interface TvRoundFxLayersProps {
  earthquakeShaking: boolean;
  bgTintClass: string | null | undefined;
  showFinalMinuteBanner: boolean;
  fireRoundActive: boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/** The broadcast's decorative round FX: earthquake cracks, urgency tint, final-minute banner, fire frame. */
const TvRoundFxLayers = memo<TvRoundFxLayersProps>(({
  earthquakeShaking,
  bgTintClass,
  showFinalMinuteBanner,
  fireRoundActive,
  t,
}) => (
  <>
        {/* Earthquake cracks overlay */}
        <AnimatePresence>
          {earthquakeShaking && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-15 pointer-events-none mix-blend-screen"
              aria-hidden="true"
            >
              <Image
                src="/images/tv-broadcast/fx-earthquake-cracks.png"
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
            </m.div>
          )}
        </AnimatePresence>

        {/* Background tint overlay for final minute urgency */}
        {bgTintClass && (
          <div
            className={`absolute inset-0 ${bgTintClass} pointer-events-none z-10 transition-colors duration-1000`}
            data-testid="urgency-tint"
          />
        )}

        {/* Final Minute Banner */}
        <AnimatePresence>
          {showFinalMinuteBanner && (
            <m.div
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-neo-red text-neo-cream px-8 py-4 rounded-neo border-3 border-neo-black shadow-hard-lg"
              data-testid="final-minute-banner"
            >
              <p className="font-black text-2xl uppercase tracking-wider text-center">
                {t('tvBroadcast.notifications.finalMinute')}
              </p>
              <p className="text-sm font-bold text-center opacity-80">
                {t('tvBroadcast.notifications.everySecondCounts')}
              </p>
            </m.div>
          )}
        </AnimatePresence>

        {/* Fire Round Overlay — dramatic flame image + edge gradients */}
        <AnimatePresence>
          {fireRoundActive && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 pointer-events-none z-20"
              data-testid="fire-round-overlay"
              aria-hidden="true"
            >
              {/* Fire frame overlay — illustrated flames on all edges */}
              <m.div
                className="absolute inset-0"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src="/images/tv-broadcast/fx-fire-frame.png"
                  alt=""
                  fill
                  className="object-cover mix-blend-screen"
                  sizes="100vw"
                />
              </m.div>
              {/* Bottom fire flames */}
              <m.div
                className="absolute bottom-0 left-0 right-0 h-48"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src="/images/tv-broadcast/tv-fire-overlay.png"
                  alt=""
                  fill
                  className="object-cover object-top mix-blend-screen"
                  sizes="100vw"
                />
              </m.div>
              {/* Heat vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(255,80,0,0.2)_100%)]" />
            </m.div>
          )}
        </AnimatePresence>
  </>
));

TvRoundFxLayers.displayName = 'TvRoundFxLayers';

export default TvRoundFxLayers;
