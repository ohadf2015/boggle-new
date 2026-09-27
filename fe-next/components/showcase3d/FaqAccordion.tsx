'use client';

import { useState } from 'react';

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Neo-brutalist FAQ accordion — visible (nicer UI) AND in the SSR HTML (crawlable
 * for SEO/GEO; pairs with the FAQPage JSON-LD). Answers expand via grid-rows 0fr→1fr
 * (no height animation jank), reduced-motion-safe, keyboard accessible.
 */
export default function FaqAccordion({ title, items }: { title: string; items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 lg:px-10">
      <h2 className="mb-8 font-neo-display text-3xl font-bold sm:text-4xl">{title}</h2>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className={`overflow-hidden rounded-neo-lg border-neo-thick border-black bg-neo-navy-light shadow-hard transition-shadow duration-200 ${isOpen ? 'shadow-hard-lg' : ''}`}
            >
              <h3 className="m-0">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-neo-display text-lg font-bold text-neo-white"
                >
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-neo border-neo border-black font-neo-display text-xl leading-none transition-all duration-200 ${
                      isOpen ? 'rotate-45 bg-neo-lime text-black' : 'bg-neo-navy text-neo-lime'
                    }`}
                  >
                    +
                  </span>
                </button>
              </h3>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="border-t-[3px] border-black/40 px-5 py-4 font-neo-body text-neo-white">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
