'use client';

import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FEATURES } from '../data';

export function FeatureGrid() {
  const reduced = useReducedMotion();

  return (
    <section className="mb-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          Jugar Scrabble Online en Español<span className="text-neo-pink"> — ¿Por qué LexiClash?</span>
        </h2>
        <div
          aria-hidden
          className="hidden h-1 flex-1 -skew-x-12 bg-gradient-to-r from-neo-pink/50 via-neo-cyan/30 to-transparent sm:block"
        />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {FEATURES.map((feature, i) => (
          <m.li
            key={feature.text}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={
              reduced
                ? undefined
                : {
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                    delay: 0.04 * i,
                  }
            }
            whileHover={reduced ? undefined : { y: -3 }}
            className={cn(
              'flex items-start gap-3 rounded-neo border-3 bg-neo-navy-light/50 p-4 transition-shadow duration-150',
              feature.accent
            )}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-neo border-2 border-neo-black bg-neo-navy text-lg shadow-hard-sm"
              aria-hidden
            >
              {feature.icon}
            </span>
            <p className="pt-0.5 font-neo-body text-sm font-medium leading-snug text-neo-white sm:text-base">
              {feature.text}
            </p>
          </m.li>
        ))}
      </ul>
    </section>
  );
}
