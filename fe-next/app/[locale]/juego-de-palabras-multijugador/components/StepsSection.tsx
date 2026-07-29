'use client';

import Image from 'next/image';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { STEPS } from '../data';

export function StepsSection() {
  const reduced = useReducedMotion();

  return (
    <section className="mb-14">
      <div className="mb-7 flex items-center gap-4">
        <span
          aria-hidden
          className="inline-block h-3 w-3 -rotate-45 border-3 border-neo-pink bg-neo-pink"
        />
        <h2 className="font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          Empieza en 30 segundos
        </h2>
      </div>

      <ol className="grid gap-5 sm:grid-cols-3 sm:gap-4">
        {STEPS.map((step, i) => (
          <m.li
            key={step.n}
            initial={reduced ? false : { opacity: 0, y: 24, rotate: 0 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={
              reduced
                ? undefined
                : {
                    type: 'spring',
                    stiffness: 200,
                    damping: 22,
                    delay: 0.1 * i,
                  }
            }
            whileHover={reduced ? undefined : { y: -4, rotate: 0 }}
            className={cn(
              'relative flex flex-col items-start rounded-neo border-3 border-neo-black p-5 shadow-hard-lg sm:p-6',
              step.bg,
              step.text,
              step.rot
            )}
          >
            <span
              aria-hidden
              className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border-3 border-neo-black bg-neo-navy font-neo-display text-sm font-black text-neo-white shadow-hard-sm sm:h-12 sm:w-12 sm:text-base"
            >
              {step.n}
            </span>

            <div className="relative mb-3 h-20 w-20 sm:h-24 sm:w-24">
              <Image
                src={step.mascot}
                alt=""
                fill
                sizes="(min-width: 640px) 96px, 80px"
                className="object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]"
              />
            </div>

            <h3 className="font-neo-display text-lg font-black uppercase leading-tight sm:text-xl">
              {step.title}
            </h3>
            <p className="mt-2 font-neo-body text-sm font-medium leading-snug">
              {step.body}
            </p>
          </m.li>
        ))}
      </ol>
    </section>
  );
}
