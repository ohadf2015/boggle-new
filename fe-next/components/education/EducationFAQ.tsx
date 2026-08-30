'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { JsonLd } from '@/components/seo/JsonLd';
import { educationFaqJsonLd } from '@/lib/seo/educationStructuredData';

const KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;

export function EducationFAQ() {
  const { t } = useLanguage();
  const [open, setOpen] = useState<string | null>(null);

  const qa = KEYS.map((k) => ({
    q: t(`education.landing.faq.${k}.q`),
    a: t(`education.landing.faq.${k}.a`),
  }));

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-3xl font-neo-display font-extrabold text-neo-white">
        {t('education.landing.faq.title')}
      </h2>
      {/* Native <details>: answers ship in the initial HTML (so crawlers and AI
          answer engines can read them) and the accordion works without JS. */}
      <div className="mt-6 space-y-3">
        {KEYS.map((k, i) => (
          <details
            key={k}
            className="group rounded-neo border-neo-thick border-neo-navy bg-neo-cream"
            open={open === k}
            onToggle={(e) => setOpen(e.currentTarget.open ? k : null)}
          >
            <summary className="flex w-full cursor-pointer list-none items-center justify-between p-4 text-start font-bold text-neo-navy transition-colors hover:bg-neo-cream/80">
              <span className="education-faq-q">{qa[i].q}</span>
              <span aria-hidden className="text-lg transition-transform duration-150 group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="border-t-2 border-neo-navy/20 p-4 text-neo-navy/70">{qa[i].a}</div>
          </details>
        ))}
      </div>
      {/* Inline, not next/script: `afterInteractive` runs post-hydration and
          crawlers that only read the initial HTML never see the FAQPage node. */}
      <JsonLd data={educationFaqJsonLd(qa)} />
    </section>
  );
}
