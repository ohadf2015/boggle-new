'use client';

import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAQS, FAQ_ACCENTS } from '../data';

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();

  return (
    <section className="mb-14">
      <h2 className="mb-6 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
        Preguntas frecuentes
      </h2>

      <ul className="space-y-3">
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          const accent = FAQ_ACCENTS[i % FAQ_ACCENTS.length];
          return (
            <li
              key={faq.q}
              className={cn(
                'rounded-neo border-3 bg-neo-navy-light/55',
                accent
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-neo-display text-sm font-black uppercase tracking-wide text-neo-white transition-colors hover:text-neo-pink sm:text-base"
              >
                <span className="flex-1">{faq.q}</span>
                <m.span
                  animate={reduced ? undefined : { rotate: isOpen ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-neo border-2 border-neo-black bg-neo-navy text-neo-pink shadow-hard-sm"
                  aria-hidden
                >
                  <ChevronDown className="h-4 w-4" />
                </m.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <m.div
                    id={`faq-panel-${i}`}
                    role="region"
                    initial={reduced ? false : { height: 0, opacity: 0 }}
                    animate={reduced ? undefined : { height: 'auto', opacity: 1 }}
                    exit={reduced ? undefined : { height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                    className="overflow-hidden"
                  >
                    <p className="border-t-2 border-dashed border-neo-white/15 px-5 py-4 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
                      {faq.a}
                    </p>
                  </m.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
