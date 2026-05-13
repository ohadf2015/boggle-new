'use client';
import Script from 'next/script';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
      <div className="mt-6 space-y-3">
        {KEYS.map((k, i) => {
          const isOpen = open === k;
          return (
            <div key={k} className="rounded-neo border-neo-thick border-neo-navy bg-neo-cream">
              <button
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : k)}
                className="flex w-full items-center justify-between p-4 text-left font-bold text-neo-navy transition-colors hover:bg-neo-cream/80"
              >
                <span className="education-faq-q">{qa[i].q}</span>
                <span aria-hidden className="text-lg">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div className="border-t-2 border-neo-navy/20 p-4 text-neo-navy/70">
                  {qa[i].a}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Script
        id="education-faq-ld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(educationFaqJsonLd(qa))}
      </Script>
    </section>
  );
}
