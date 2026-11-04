import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { EducationFaqItem } from '@/app/[locale]/education/seoContent';
import { translateKey } from '@/lib/i18n/serverTranslate';

/** Hub FAQ: server-rendered so every answer stays in the HTML that backs the FAQPage JSON-LD. */
export function EducationLandingFaq({ locale, items }: { locale: string; items: EducationFaqItem[] }) {
  return (
    <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div
        data-testid="landing-faq-grid"
        className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-12"
      >
        <div data-testid="landing-faq-aside" className="lg:sticky lg:top-24">
          <h2 className="text-balance font-neo-poster text-2xl font-extrabold leading-tight tracking-[-0.01em] text-neo-white [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl">
            {translateKey('eg2Land.faq.title', locale, 'Teacher questions')}
          </h2>
          <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-neo-white/75">
            {translateKey('eg2Land.faq.intro', locale, 'Short answers to what teachers ask before their first class.')}
          </p>
          <Link
            href={`/${locale}/education/help`}
            data-testid="landing-faq-help"
            className="group/help mt-3 inline-flex min-h-11 items-center gap-1.5 font-bold text-neo-cyan underline decoration-2 underline-offset-4 hover:text-neo-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            {translateKey('eg2Land.faq.helpLink', locale, 'More answers in the help center')}
            <ArrowRight
              aria-hidden
              className="size-4 shrink-0 transition-transform duration-150 group-hover/help:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/help:-translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2.75}
            />
          </Link>
        </div>
        <div className="mt-5 divide-y-2 divide-neo-navy/15 overflow-hidden rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard lg:mt-0">
          {items.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-start text-sm font-bold text-neo-navy group-open:bg-neo-white sm:py-3.5 sm:text-base hover:bg-neo-white/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-neo-navy [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span aria-hidden className="shrink-0 text-xl font-black transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none">
                  +
                </span>
              </summary>
              <p className="bg-neo-white px-4 pb-4 text-sm leading-relaxed text-neo-navy/80">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default EducationLandingFaq;
