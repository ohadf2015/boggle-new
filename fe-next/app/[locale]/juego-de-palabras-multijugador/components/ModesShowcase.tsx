'use client';

import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MODES } from '../data';

export function ModesShowcase() {
  const reduced = useReducedMotion();

  return (
    <section className="mb-14">
      <h2 className="mb-2 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
        Modos para Jugar Scrabble Online Gratis<span className="text-neo-cyan">.</span>
      </h2>
      <p className="mb-6 max-w-xl font-neo-body text-sm text-neo-white sm:text-base">
        Salta entre modos con un clic. Cada uno cambia el ritmo, la rejilla y la forma de ganar.
      </p>

      <div className="grid gap-5 sm:grid-cols-3 sm:gap-4">
        {MODES.map((mode, i) => (
          <m.article
            key={mode.name}
            initial={reduced ? false : { opacity: 0, y: 22 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={
              reduced
                ? undefined
                : { type: 'spring', stiffness: 220, damping: 24, delay: 0.08 * i }
            }
            whileHover={reduced ? undefined : { y: -5, rotate: 0, scale: 1.02 }}
            className={cn(
              'relative flex flex-col gap-3 rounded-neo border-3 border-neo-black p-5 shadow-hard-lg sm:p-6',
              mode.color,
              mode.text,
              mode.rot
            )}
          >
            <span
              aria-hidden
              className="grid h-12 w-12 place-items-center rounded-neo border-3 border-neo-black bg-neo-navy text-2xl shadow-hard-sm"
            >
              {mode.icon}
            </span>
            <h3 className="font-neo-display text-lg font-black uppercase leading-tight sm:text-xl">
              {mode.name}
            </h3>
            <p className="font-neo-body text-sm font-medium leading-snug">
              {mode.desc}
            </p>
          </m.article>
        ))}
      </div>
    </section>
  );
}
